module logioracle::payment_escrow {
    use std::string::String;
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::clock::{Self, Clock};

    // ── Status ────────────────────────────────────────────────────────────────
    const STATUS_OPEN:     u8 = 0;
    const STATUS_RELEASED: u8 = 1;
    const STATUS_DISPUTED: u8 = 2;
    const STATUS_REFUNDED: u8 = 3;

    const DAY_MS:            u64 = 86_400_000;
    const DISPUTE_WINDOW_MS: u64 = 172_800_000; // 48 hours

    // ── Errors ────────────────────────────────────────────────────────────────
    const ENotDepositor:         u64 = 1;
    const ENotBeneficiary:       u64 = 2;
    const EAlreadyClosed:        u64 = 3;
    const EDisputeWindowExpired: u64 = 4;
    const ENotDisputed:          u64 = 5;

    // ── Object ────────────────────────────────────────────────────────────────
    //
    // Demurrage payment escrow. The importer deposits the maximum potential
    // demurrage charge at gate-in. The smart contract holds it. At gate-out
    // the exact owed amount (calculated from the immutable gate_in_ms timestamp)
    // auto-releases to the beneficiary. The remainder returns to the depositor.
    //
    // No invoice. No dispute. No 60-day wait. Settlement in seconds.
    //
    // gate_in_ms should match the on-chain container gate-in timestamp so
    // both parties are calculating from the same immutable source.

    public struct EscrowAccount has key, store {
        id: UID,
        bl_number:          String,  // linked Bill of Lading
        container_iso:      String,  // ISO container ID (e.g. MSCU9876543)
        depositor:          address, // importer / consignee
        beneficiary:        address, // shipping line or port authority
        balance:            Balance<SUI>,
        free_days:          u64,
        rate_per_day_mist:  u64,     // SUI rate in MIST (1 SUI = 1_000_000_000)
        gate_in_ms:         u64,     // immutable gate-in timestamp (matches container)
        release_ms:         u64,     // set when beneficiary claims
        status:             u8,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct EscrowCreated has copy, drop {
        escrow_id:         address,
        bl_number:         String,
        container_iso:     String,
        depositor:         address,
        beneficiary:       address,
        amount_mist:       u64,
        free_days:         u64,
        rate_per_day_mist: u64,
        gate_in_ms:        u64,
    }

    public struct EscrowReleased has copy, drop {
        escrow_id:     address,
        bl_number:     String,
        container_iso: String,
        owed_mist:     u64,
        returned_mist: u64,
        days_at_port:  u64,
        overdue_days:  u64,
        released_at:   u64,
    }

    public struct EscrowDisputed has copy, drop {
        escrow_id:     address,
        bl_number:     String,
        container_iso: String,
        disputed_by:   address,
        disputed_at:   u64,
    }

    public struct EscrowRefunded has copy, drop {
        escrow_id:     address,
        bl_number:     String,
        container_iso: String,
        refunded_to:   address,
        amount_mist:   u64,
    }

    // ── Public functions ──────────────────────────────────────────────────────

    /// Depositor (importer) creates an escrow account at container gate-in.
    /// `payment` should cover the maximum potential demurrage: e.g. for
    /// 30 days at $150/day converted to MIST at the current SUI/USD rate.
    /// `gate_in_ms` should match the on-chain container gate-in timestamp.
    public fun create(
        bl_number:         String,
        container_iso:     String,
        beneficiary:       address,
        free_days:         u64,
        rate_per_day_mist: u64,
        gate_in_ms:        u64,
        payment:           Coin<SUI>,
        ctx:               &mut TxContext,
    ) {
        let depositor    = ctx.sender();
        let amount_mist  = coin::value(&payment);
        let escrow_id    = object::new(ctx);
        let id_addr      = object::uid_to_address(&escrow_id);

        event::emit(EscrowCreated {
            escrow_id: id_addr,
            bl_number,
            container_iso,
            depositor,
            beneficiary,
            amount_mist,
            free_days,
            rate_per_day_mist,
            gate_in_ms,
        });

        let account = EscrowAccount {
            id: escrow_id,
            bl_number,
            container_iso,
            depositor,
            beneficiary,
            balance: coin::into_balance(payment),
            free_days,
            rate_per_day_mist,
            gate_in_ms,
            release_ms: 0,
            status: STATUS_OPEN,
        };

        // Shared so both depositor and beneficiary can interact with it
        transfer::share_object(account);
    }

    /// Beneficiary (shipping line / port authority) releases the escrow
    /// after gate-out. The formula runs against the current timestamp.
    /// Owed amount goes to the beneficiary; remainder returns to depositor.
    public fun release(
        escrow:  &mut EscrowAccount,
        clock:   &Clock,
        ctx:     &mut TxContext,
    ) {
        assert!(ctx.sender() == escrow.beneficiary, ENotBeneficiary);
        assert!(escrow.status == STATUS_OPEN, EAlreadyClosed);

        let now_ms      = clock::timestamp_ms(clock);
        let (owed, days_at_port, overdue_days) = calc_demurrage(escrow, now_ms);
        let total       = balance::value(&escrow.balance);
        let pay_amount  = if (owed > total) { total } else { owed };
        let ret_amount  = total - pay_amount;

        escrow.release_ms = now_ms;
        escrow.status     = STATUS_RELEASED;

        event::emit(EscrowReleased {
            escrow_id:     object::uid_to_address(&escrow.id),
            bl_number:     escrow.bl_number,
            container_iso: escrow.container_iso,
            owed_mist:     pay_amount,
            returned_mist: ret_amount,
            days_at_port,
            overdue_days,
            released_at:   now_ms,
        });

        // Pay beneficiary
        if (pay_amount > 0) {
            let payout = coin::from_balance(balance::split(&mut escrow.balance, pay_amount), ctx);
            transfer::public_transfer(payout, escrow.beneficiary);
        };

        // Return remainder to depositor
        if (ret_amount > 0) {
            let refund = coin::from_balance(balance::split(&mut escrow.balance, ret_amount), ctx);
            transfer::public_transfer(refund, escrow.depositor);
        };
    }

    /// Depositor raises a dispute within 48 hours of the release being claimed.
    /// The escrow is frozen until the DAO resolves it (Phase 4).
    /// For now this blocks the automatic release until resolved.
    public fun dispute(
        escrow:  &mut EscrowAccount,
        clock:   &Clock,
        ctx:     &mut TxContext,
    ) {
        assert!(ctx.sender() == escrow.depositor, ENotDepositor);
        assert!(escrow.status == STATUS_OPEN, EAlreadyClosed);

        let now_ms = clock::timestamp_ms(clock);
        assert!(now_ms <= escrow.gate_in_ms + DISPUTE_WINDOW_MS, EDisputeWindowExpired);

        escrow.status = STATUS_DISPUTED;

        event::emit(EscrowDisputed {
            escrow_id:     object::uid_to_address(&escrow.id),
            bl_number:     escrow.bl_number,
            container_iso: escrow.container_iso,
            disputed_by:   ctx.sender(),
            disputed_at:   now_ms,
        });
    }

    /// Admin / DAO resolves a dispute and returns funds to depositor.
    /// In Phase 4 this will be replaced by dispute_dao.move governance.
    public fun refund_disputed(
        escrow:  &mut EscrowAccount,
        ctx:     &mut TxContext,
    ) {
        // Only depositor can trigger refund after dispute (simplified for Phase 2)
        assert!(ctx.sender() == escrow.depositor, ENotDepositor);
        assert!(escrow.status == STATUS_DISPUTED, ENotDisputed);

        let amount = balance::value(&escrow.balance);
        escrow.status = STATUS_REFUNDED;

        event::emit(EscrowRefunded {
            escrow_id:     object::uid_to_address(&escrow.id),
            bl_number:     escrow.bl_number,
            container_iso: escrow.container_iso,
            refunded_to:   escrow.depositor,
            amount_mist:   amount,
        });

        if (amount > 0) {
            let refund = coin::from_balance(
                balance::split(&mut escrow.balance, amount), ctx
            );
            transfer::public_transfer(refund, escrow.depositor);
        };
    }

    // ── View functions ────────────────────────────────────────────────────────

    /// Returns (owed_mist, days_at_port, overdue_days) at a given timestamp.
    /// Both parties can call this with the same timestamp and get the same result.
    public fun calc_owed_at(escrow: &EscrowAccount, now_ms: u64): (u64, u64, u64) {
        calc_demurrage(escrow, now_ms)
    }

    public fun get_status(escrow: &EscrowAccount): u8            { escrow.status }
    public fun get_balance(escrow: &EscrowAccount): u64          { balance::value(&escrow.balance) }
    public fun get_bl_number(escrow: &EscrowAccount): String     { escrow.bl_number }
    public fun get_container_iso(escrow: &EscrowAccount): String { escrow.container_iso }
    public fun get_gate_in_ms(escrow: &EscrowAccount): u64       { escrow.gate_in_ms }
    public fun get_free_days(escrow: &EscrowAccount): u64        { escrow.free_days }
    public fun get_rate(escrow: &EscrowAccount): u64             { escrow.rate_per_day_mist }
    public fun get_depositor(escrow: &EscrowAccount): address    { escrow.depositor }
    public fun get_beneficiary(escrow: &EscrowAccount): address  { escrow.beneficiary }

    public fun status_open(): u8     { STATUS_OPEN }
    public fun status_released(): u8 { STATUS_RELEASED }
    public fun status_disputed(): u8 { STATUS_DISPUTED }
    public fun status_refunded(): u8 { STATUS_REFUNDED }

    // ── Internal ──────────────────────────────────────────────────────────────

    fun calc_demurrage(escrow: &EscrowAccount, now_ms: u64): (u64, u64, u64) {
        if (now_ms <= escrow.gate_in_ms) return (0, 0, 0);
        let elapsed_ms   = now_ms - escrow.gate_in_ms;
        let days_at_port = elapsed_ms / DAY_MS;
        if (days_at_port <= escrow.free_days) return (0, days_at_port, 0);
        let overdue_days = days_at_port - escrow.free_days;
        let owed         = overdue_days * escrow.rate_per_day_mist;
        (owed, days_at_port, overdue_days)
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    #[test_only]
    use sui::test_scenario::{Self as ts, Scenario};
    #[test_only]
    use sui::coin::mint_for_testing;

    #[test]
    fun test_no_demurrage_within_free_period() {
        let depositor   = @0xA;
        let beneficiary = @0xB;
        let mut sc      = ts::begin(depositor);

        let gate_in_ms: u64 = 1_000_000;
        let free_days:  u64 = 14;
        let rate:       u64 = 150_000_000; // 0.15 SUI/day in MIST

        // Create a clock at gate-in time
        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, gate_in_ms);

        // Depositor creates escrow with 30 days × rate
        sc.next_tx(depositor);
        {
            let payment = mint_for_testing<SUI>(rate * 30, sc.ctx());
            create(
                b"BL-TEST-001".to_string(),
                b"MSCU9876543".to_string(),
                beneficiary,
                free_days,
                rate,
                gate_in_ms,
                payment,
                sc.ctx(),
            );
        };

        // Advance clock to day 10 (within free period)
        clock::set_for_testing(&mut clk, gate_in_ms + 10 * 86_400_000);

        sc.next_tx(beneficiary);
        {
            let mut escrow = sc.take_shared<EscrowAccount>();
            let (owed, days, overdue) = calc_owed_at(&escrow, clock::timestamp_ms(&clk));
            assert!(owed == 0, 0);
            assert!(days == 10, 1);
            assert!(overdue == 0, 2);
            ts::return_shared(escrow);
        };

        clock::destroy_for_testing(clk);
        sc.end();
    }

    #[test]
    fun test_demurrage_accrues_after_free_days() {
        let depositor   = @0xA;
        let beneficiary = @0xB;
        let mut sc      = ts::begin(depositor);

        let gate_in_ms: u64 = 1_000_000;
        let free_days:  u64 = 14;
        let rate:       u64 = 150_000_000;

        let mut clk = clock::create_for_testing(sc.ctx());
        clock::set_for_testing(&mut clk, gate_in_ms);

        sc.next_tx(depositor);
        {
            let payment = mint_for_testing<SUI>(rate * 30, sc.ctx());
            create(
                b"BL-TEST-002".to_string(),
                b"MSCU9876543".to_string(),
                beneficiary,
                free_days,
                rate,
                gate_in_ms,
                payment,
                sc.ctx(),
            );
        };

        // Advance to day 20 (6 days overdue)
        clock::set_for_testing(&mut clk, gate_in_ms + 20 * 86_400_000);

        sc.next_tx(beneficiary);
        {
            let escrow = sc.take_shared<EscrowAccount>();
            let (owed, days, overdue) = calc_owed_at(&escrow, clock::timestamp_ms(&clk));
            assert!(days == 20, 0);
            assert!(overdue == 6, 1);
            assert!(owed == 6 * rate, 2);
            ts::return_shared(escrow);
        };

        clock::destroy_for_testing(clk);
        sc.end();
    }
}
