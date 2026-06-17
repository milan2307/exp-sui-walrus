module logioracle::freight_rate {
    use std::string::String;

    // ── Error codes ───────────────────────────────────────────────────────────
    const ENotCarrier: u64 = 0;
    const ENotShipper: u64 = 1;
    const ENotActive: u64 = 2;
    const EExpired: u64 = 3;

    // ── Status ────────────────────────────────────────────────────────────────
    const STATUS_OFFERED: u8 = 0;    // carrier offers rate, shipper hasn't accepted
    const STATUS_ACCEPTED: u8 = 1;   // shipper locks the rate — binding
    const STATUS_EXPIRED: u8 = 2;
    const STATUS_CANCELLED: u8 = 3;

    // ── Object ────────────────────────────────────────────────────────────────
    //
    // A freight rate contract locks the price per container between a shipping
    // line (carrier) and a shipper for a defined route and period.
    // Eliminates "they offered $X verbally" disputes.
    //
    // Shared so both carrier and shipper can interact.
    // rate_cents: rate per container in USD cents.

    public struct FreightRate has key, store {
        id: sui::object::UID,
        rate_id: String,
        carrier: address,
        carrier_name: String,
        shipper: address,
        origin_port: String,
        destination_port: String,
        container_size: String,     // 20GP, 40HC, 45HC
        rate_cents: u64,            // USD cents per container
        currency: String,
        valid_from_ms: u64,
        valid_until_ms: u64,
        commodity: String,          // cargo type (affects rate)
        status: u8,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct RateOffered has copy, drop {
        rate_id: String,
        carrier: address,
        shipper: address,
        origin_port: String,
        destination_port: String,
        container_size: String,
        rate_cents: u64,
        valid_until_ms: u64,
    }

    public struct RateAccepted has copy, drop {
        rate_id: String,
        shipper: address,
        rate_cents: u64,
    }

    public struct RateCancelled has copy, drop {
        rate_id: String,
        cancelled_by: address,
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    /// Carrier offers a rate to a named shipper.
    public fun offer_and_share(
        rate_id: String,
        carrier_name: String,
        shipper: address,
        origin_port: String,
        destination_port: String,
        container_size: String,
        rate_cents: u64,
        currency: String,
        valid_from_ms: u64,
        valid_until_ms: u64,
        commodity: String,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let carrier = sui::tx_context::sender(ctx);
        let rate = FreightRate {
            id: sui::object::new(ctx),
            rate_id,
            carrier,
            carrier_name,
            shipper,
            origin_port,
            destination_port,
            container_size,
            rate_cents,
            currency,
            valid_from_ms,
            valid_until_ms,
            commodity,
            status: STATUS_OFFERED,
        };

        sui::event::emit(RateOffered {
            rate_id: rate.rate_id,
            carrier,
            shipper: rate.shipper,
            origin_port: rate.origin_port,
            destination_port: rate.destination_port,
            container_size: rate.container_size,
            rate_cents: rate.rate_cents,
            valid_until_ms: rate.valid_until_ms,
        });

        sui::transfer::share_object(rate);
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /// Shipper accepts the offered rate — now binding on both parties.
    public fun accept(
        rate: &mut FreightRate,
        current_ms: u64,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == rate.shipper, ENotShipper);
        assert!(rate.status == STATUS_OFFERED, ENotActive);
        assert!(current_ms <= rate.valid_until_ms, EExpired);

        rate.status = STATUS_ACCEPTED;
        sui::event::emit(RateAccepted {
            rate_id: rate.rate_id,
            shipper: rate.shipper,
            rate_cents: rate.rate_cents,
        });
    }

    /// Either party can cancel before acceptance; only carrier can cancel after.
    public fun cancel(
        rate: &mut FreightRate,
        ctx: &sui::tx_context::TxContext
    ) {
        let caller = sui::tx_context::sender(ctx);
        if (rate.status == STATUS_ACCEPTED) {
            assert!(caller == rate.carrier, ENotCarrier);
        } else {
            assert!(caller == rate.carrier || caller == rate.shipper, ENotCarrier);
        };
        rate.status = STATUS_CANCELLED;
        sui::event::emit(RateCancelled { rate_id: rate.rate_id, cancelled_by: caller });
    }

    /// Mark expired — callable by anyone when valid_until_ms has passed.
    public fun expire(
        rate: &mut FreightRate,
        current_ms: u64,
        _ctx: &sui::tx_context::TxContext
    ) {
        assert!(rate.status == STATUS_OFFERED, ENotActive);
        assert!(current_ms > rate.valid_until_ms, ENotActive);
        rate.status = STATUS_EXPIRED;
    }

    // ── Getters ───────────────────────────────────────────────────────────────

    public fun get_rate_id(r: &FreightRate): String       { r.rate_id }
    public fun get_status(r: &FreightRate): u8            { r.status }
    public fun get_carrier(r: &FreightRate): address      { r.carrier }
    public fun get_shipper(r: &FreightRate): address      { r.shipper }
    public fun get_rate_cents(r: &FreightRate): u64       { r.rate_cents }
    public fun get_origin_port(r: &FreightRate): String   { r.origin_port }
    public fun get_destination_port(r: &FreightRate): String { r.destination_port }
    public fun get_valid_until_ms(r: &FreightRate): u64   { r.valid_until_ms }

    public fun status_offered(): u8  { STATUS_OFFERED }
    public fun status_accepted(): u8 { STATUS_ACCEPTED }
    public fun status_expired(): u8  { STATUS_EXPIRED }

    // ── Test helpers ──────────────────────────────────────────────────────────

    #[test_only]
    public fun create_for_testing(
        rate_id: String,
        shipper: address,
        origin_port: String,
        destination_port: String,
        rate_cents: u64,
        valid_until_ms: u64,
        ctx: &mut sui::tx_context::TxContext
    ): FreightRate {
        let carrier = sui::tx_context::sender(ctx);
        FreightRate {
            id: sui::object::new(ctx),
            rate_id,
            carrier,
            carrier_name: b"Test Carrier".to_string(),
            shipper,
            origin_port,
            destination_port,
            container_size: b"40HC".to_string(),
            rate_cents,
            currency: b"USD".to_string(),
            valid_from_ms: 0,
            valid_until_ms,
            commodity: b"General Cargo".to_string(),
            status: STATUS_OFFERED,
        }
    }

    #[test_only]
    public fun destroy_for_testing(r: FreightRate) {
        let FreightRate {
            id, rate_id: _, carrier: _, carrier_name: _, shipper: _, origin_port: _,
            destination_port: _, container_size: _, rate_cents: _, currency: _,
            valid_from_ms: _, valid_until_ms: _, commodity: _, status: _,
        } = r;
        sui::object::delete(id);
    }
}
