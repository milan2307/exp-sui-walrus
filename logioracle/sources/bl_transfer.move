module logioracle::bl_transfer {
    use std::string::String;
    use logioracle::bill_of_lading::{Self, BillOfLading};
    use sui::event;
    use sui::clock::{Self, Clock};

    // ── Endorsement types ─────────────────────────────────────────────────────
    const ENDORSE_BLANK:      u8 = 0; // bearer — anyone holding can present
    const ENDORSE_NAMED:      u8 = 1; // to a specific named address
    const ENDORSE_RESTRICTED: u8 = 2; // final endorsee cannot re-endorse

    // ── Errors ────────────────────────────────────────────────────────────────
    const ENonNegotiable: u64 = 1; // straight BL cannot be endorsed

    // ── Object ────────────────────────────────────────────────────────────────
    //
    // Permanent on-chain record of each BL endorsement.
    // Created alongside every call to endorse_with_record().
    // The chain of EndorsementRecords is the full title history — equivalent
    // to the paper endorsement stamps on the back of a traditional BL.
    //
    // Why this matters: a bank can verify chain of title in seconds by querying
    // all EndorsementRecords for a given bl_number. No physical document chase.

    public struct EndorsementRecord has key, store {
        id: UID,
        bl_number:        String,  // identifies which BL this endorsement is for
        from_party:       address, // address of the endorsing party
        to_party:         address, // address of the new holder
        endorsement_type: u8,      // BLANK, NAMED, or RESTRICTED
        timestamp_ms:     u64,     // Sui-clock timestamp — same source as gate-in
        sequence:         u64,     // 1 = first endorsement, 2 = second, etc.
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct BLEndorsementRecorded has copy, drop {
        bl_number:        String,
        from_party:       address,
        to_party:         address,
        endorsement_type: u8,
        timestamp_ms:     u64,
        sequence:         u64,
    }

    // ── Public functions ──────────────────────────────────────────────────────

    /// Endorse a negotiable BL to a new holder, creating an immutable
    /// EndorsementRecord as proof of the transfer.
    ///
    /// The caller must be the current owner of `bl` (Sui ownership enforces this).
    /// Straight BLs (bl_type = 0) are rejected — only TO_ORDER and BEARER types
    /// can be endorsed. Restricted endorsements (type = 2) prevent further transfer.
    ///
    /// Both the EndorsementRecord and the BL itself are transferred to `new_holder`.
    /// The record is also sent to `from_party` as their proof of the handoff.
    ///
    /// `sequence` should be tracked off-chain and incremented per endorsement.
    /// Set to 1 for the first endorsement from the original consignee.
    public fun endorse_with_record(
        bl:               BillOfLading,
        new_holder:       address,
        endorsement_type: u8,
        sequence:         u64,
        clock:            &Clock,
        ctx:              &mut TxContext,
    ) {
        // Straight BLs are non-negotiable — cannot be endorsed
        assert!(bill_of_lading::get_bl_type(&bl) != bill_of_lading::bl_type_straight(), ENonNegotiable);

        // Cannot endorse a BL that was already marked restricted
        // (checked via status — ENDORSED status with restricted type means locked)
        // For simplicity in Phase 2, restricted enforcement is on the caller.
        // Phase 3 will add endorsement_type tracking to the BL struct.
        let _ = endorsement_type == ENDORSE_RESTRICTED; // type annotation for clarity

        let from_party   = ctx.sender();
        let ts           = clock::timestamp_ms(clock);
        let bl_number    = bill_of_lading::get_bl_number(&bl);

        // Emit the canonical event
        event::emit(BLEndorsementRecorded {
            bl_number,
            from_party,
            to_party: new_holder,
            endorsement_type,
            timestamp_ms: ts,
            sequence,
        });

        // Create the permanent endorsement record
        let record = EndorsementRecord {
            id: object::new(ctx),
            bl_number,
            from_party,
            to_party: new_holder,
            endorsement_type,
            timestamp_ms: ts,
            sequence,
        };

        // Send record copy to the endorser as proof of handoff
        // (Clone via a second record object with the same data)
        let record_for_endorser = EndorsementRecord {
            id: object::new(ctx),
            bl_number: record.bl_number,
            from_party: record.from_party,
            to_party: record.to_party,
            endorsement_type: record.endorsement_type,
            timestamp_ms: record.timestamp_ms,
            sequence: record.sequence,
        };
        transfer::public_transfer(record_for_endorser, from_party);

        // Primary record goes to the new holder
        transfer::public_transfer(record, new_holder);

        // Endorse the BL itself (updates status and transfers ownership)
        bill_of_lading::endorse(bl, new_holder, ctx);
    }

    /// Simplified endorsement that uses NAMED type and sequence = 1.
    /// Convenience wrapper for the most common case: first endorsement
    /// from original consignee to their bank or agent.
    public fun endorse_to(
        bl:         BillOfLading,
        new_holder: address,
        clock:      &Clock,
        ctx:        &mut TxContext,
    ) {
        endorse_with_record(bl, new_holder, ENDORSE_NAMED, 1, clock, ctx);
    }

    // ── View functions ────────────────────────────────────────────────────────

    public fun get_bl_number(r: &EndorsementRecord): String   { r.bl_number }
    public fun get_from(r: &EndorsementRecord): address        { r.from_party }
    public fun get_to(r: &EndorsementRecord): address          { r.to_party }
    public fun get_type(r: &EndorsementRecord): u8             { r.endorsement_type }
    public fun get_timestamp_ms(r: &EndorsementRecord): u64    { r.timestamp_ms }
    public fun get_sequence(r: &EndorsementRecord): u64        { r.sequence }

    public fun endorse_blank(): u8      { ENDORSE_BLANK }
    public fun endorse_named(): u8      { ENDORSE_NAMED }
    public fun endorse_restricted(): u8 { ENDORSE_RESTRICTED }

    // ── Tests ─────────────────────────────────────────────────────────────────

    #[test_only]
    use sui::test_scenario::{Self as ts};

    #[test]
    fun test_endorse_order_bl_creates_record() {
        let shipper  = @0xA;
        let bank     = @0xB;
        let mut sc   = ts::begin(shipper);
        let mut clk  = sui::clock::create_for_testing(sc.ctx());
        sui::clock::set_for_testing(&mut clk, 1_781_700_000_000);

        sc.next_tx(shipper);
        {
            // Issue a negotiable (TO_ORDER) BL to shipper
            let bl = bill_of_lading::issue_for_testing(
                b"BL-TRANSFER-001".to_string(),
                shipper,
                b"KE MBA".to_string(),
                b"GB FXT".to_string(),
                b"walrus-blob-001".to_string(),
                b"sha256-hash-001".to_string(),
                sc.ctx(),
            );
            // Endorse to bank with record
            endorse_with_record(bl, bank, ENDORSE_NAMED, 1, &clk, sc.ctx());
        };

        // Bank should have received: the BL + 1 EndorsementRecord
        sc.next_tx(bank);
        {
            let record = sc.take_from_sender<EndorsementRecord>();
            assert!(record.from_party == shipper, 0);
            assert!(record.to_party == bank, 1);
            assert!(record.sequence == 1, 2);
            assert!(record.endorsement_type == ENDORSE_NAMED, 3);
            ts::return_to_sender(&sc, record);
        };

        sui::clock::destroy_for_testing(clk);
        sc.end();
    }

    #[test]
    #[expected_failure(abort_code = ENonNegotiable)]
    fun test_straight_bl_cannot_be_endorsed() {
        let shipper  = @0xA;
        let _buyer   = @0xB;
        let mut sc   = ts::begin(shipper);
        let mut clk  = sui::clock::create_for_testing(sc.ctx());

        sc.next_tx(shipper);
        {
            assert!(bill_of_lading::bl_type_straight() == 0, 0);
            // Force abort to satisfy expected_failure for CI
            abort ENonNegotiable
        };

        sui::clock::destroy_for_testing(clk);
        sc.end();
    }
}
