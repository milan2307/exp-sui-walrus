module logioracle::container {
    use std::string::String;

    // ── Error codes ───────────────────────────────────────────────────────────
    const EInvalidTransition: u64 = 1;

    // ── Status ────────────────────────────────────────────────────────────────
    const STATUS_EMPTY: u8 = 0;
    const STATUS_STUFFED: u8 = 1;      // cargo loaded inside
    const STATUS_GATE_IN: u8 = 2;      // entered port terminal
    const STATUS_ON_VESSEL: u8 = 3;
    const STATUS_DISCHARGED: u8 = 4;   // unloaded from vessel
    const STATUS_CUSTOMS_CLEARED: u8 = 5;
    const STATUS_GATE_OUT: u8 = 6;     // released to consignee
    const STATUS_RETURNED: u8 = 7;     // empty, back at depot

    // ── Object ────────────────────────────────────────────────────────────────
    //
    // A container lives for 25+ years across hundreds of shipments.
    // Owned object — the current operator holds it. Transferred between
    // operators as the container moves through the network.
    // All location events are emitted so off-chain indexers build history.

    public struct Container has key, store {
        id: sui::object::UID,
        iso_id: String,            // ISO 6346: e.g. MSCU1234567
        size_type: String,         // 20GP, 40HC, 45HC, 20RF (reefer)
        operator_name: String,     // current operator name
        port_of_registration: String,
        manufactured_year: u64,
        current_location: String,
        status: u8,
        last_event_ms: u64,        // ms timestamp of last status change
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct ContainerStuffed has copy, drop {
        iso_id: String,
        bl_number: String,
        location: String,
        timestamp_ms: u64,
    }

    public struct ContainerGateIn has copy, drop {
        iso_id: String,
        port: String,
        timestamp_ms: u64,
    }

    public struct ContainerLoadedOnVessel has copy, drop {
        iso_id: String,
        vessel: String,
        port_of_loading: String,
        timestamp_ms: u64,
    }

    public struct ContainerDischarged has copy, drop {
        iso_id: String,
        vessel: String,
        port_of_discharge: String,
        timestamp_ms: u64,
    }

    public struct ContainerCustomsCleared has copy, drop {
        iso_id: String,
        port: String,
        timestamp_ms: u64,
        cleared_by: address,
    }

    public struct ContainerGateOut has copy, drop {
        iso_id: String,
        port: String,
        consignee: address,
        timestamp_ms: u64,
    }

    public struct ContainerReturned has copy, drop {
        iso_id: String,
        depot: String,
        timestamp_ms: u64,
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    /// Shipping line registers a new container on-chain.
    /// The caller (shipping line) becomes the initial operator.
    public fun register(
        iso_id: String,
        size_type: String,
        operator_name: String,
        port_of_registration: String,
        manufactured_year: u64,
        clock: &sui::clock::Clock,
        ctx: &mut sui::tx_context::TxContext
    ): Container {
        Container {
            id: sui::object::new(ctx),
            iso_id,
            size_type,
            operator_name,
            port_of_registration,
            manufactured_year,
            current_location: port_of_registration,
            status: STATUS_EMPTY,
            last_event_ms: sui::clock::timestamp_ms(clock),
        }
    }

    /// Register and transfer to operator address.
    public fun register_and_transfer(
        iso_id: String,
        size_type: String,
        operator_name: String,
        port_of_registration: String,
        manufactured_year: u64,
        operator: address,
        clock: &sui::clock::Clock,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let c = register(
            iso_id, size_type, operator_name, port_of_registration,
            manufactured_year, clock, ctx
        );
        sui::transfer::public_transfer(c, operator);
    }

    // ── Lifecycle events ──────────────────────────────────────────────────────

    public fun stuff(
        c: &mut Container,
        bl_number: String,
        location: String,
        clock: &sui::clock::Clock,
        _ctx: &sui::tx_context::TxContext
    ) {
        assert!(c.status == STATUS_EMPTY, EInvalidTransition);
        let ts = sui::clock::timestamp_ms(clock);
        c.status = STATUS_STUFFED;
        c.current_location = location;
        c.last_event_ms = ts;
        sui::event::emit(ContainerStuffed { iso_id: c.iso_id, bl_number, location: c.current_location, timestamp_ms: ts });
    }

    public fun gate_in(
        c: &mut Container,
        port: String,
        clock: &sui::clock::Clock,
        _ctx: &sui::tx_context::TxContext
    ) {
        assert!(c.status == STATUS_STUFFED || c.status == STATUS_EMPTY, EInvalidTransition);
        let ts = sui::clock::timestamp_ms(clock);
        c.status = STATUS_GATE_IN;
        c.current_location = port;
        c.last_event_ms = ts;
        sui::event::emit(ContainerGateIn { iso_id: c.iso_id, port: c.current_location, timestamp_ms: ts });
    }

    public fun load_on_vessel(
        c: &mut Container,
        vessel: String,
        clock: &sui::clock::Clock,
        _ctx: &sui::tx_context::TxContext
    ) {
        assert!(c.status == STATUS_GATE_IN, EInvalidTransition);
        let ts = sui::clock::timestamp_ms(clock);
        let port = c.current_location;
        c.status = STATUS_ON_VESSEL;
        c.last_event_ms = ts;
        sui::event::emit(ContainerLoadedOnVessel {
            iso_id: c.iso_id, vessel, port_of_loading: port, timestamp_ms: ts
        });
    }

    public fun discharge(
        c: &mut Container,
        vessel: String,
        port: String,
        clock: &sui::clock::Clock,
        _ctx: &sui::tx_context::TxContext
    ) {
        assert!(c.status == STATUS_ON_VESSEL, EInvalidTransition);
        let ts = sui::clock::timestamp_ms(clock);
        c.status = STATUS_DISCHARGED;
        c.current_location = port;
        c.last_event_ms = ts;
        sui::event::emit(ContainerDischarged {
            iso_id: c.iso_id, vessel, port_of_discharge: port, timestamp_ms: ts
        });
    }

    public fun customs_clear(
        c: &mut Container,
        clock: &sui::clock::Clock,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(c.status == STATUS_DISCHARGED, EInvalidTransition);
        let ts = sui::clock::timestamp_ms(clock);
        let port = c.current_location;
        c.status = STATUS_CUSTOMS_CLEARED;
        c.last_event_ms = ts;
        sui::event::emit(ContainerCustomsCleared {
            iso_id: c.iso_id, port, timestamp_ms: ts, cleared_by: sui::tx_context::sender(ctx)
        });
    }

    public fun gate_out(
        c: &mut Container,
        consignee: address,
        clock: &sui::clock::Clock,
        _ctx: &sui::tx_context::TxContext
    ) {
        assert!(c.status == STATUS_CUSTOMS_CLEARED, EInvalidTransition);
        let ts = sui::clock::timestamp_ms(clock);
        let port = c.current_location;
        c.status = STATUS_GATE_OUT;
        c.last_event_ms = ts;
        sui::event::emit(ContainerGateOut { iso_id: c.iso_id, port, consignee, timestamp_ms: ts });
    }

    public fun return_empty(
        c: &mut Container,
        depot: String,
        clock: &sui::clock::Clock,
        _ctx: &sui::tx_context::TxContext
    ) {
        assert!(c.status == STATUS_GATE_OUT, EInvalidTransition);
        let ts = sui::clock::timestamp_ms(clock);
        c.status = STATUS_RETURNED;
        c.current_location = depot;
        c.last_event_ms = ts;
        sui::event::emit(ContainerReturned { iso_id: c.iso_id, depot: c.current_location, timestamp_ms: ts });
    }

    // ── Demurrage / Detention calculation ────────────────────────────────────
    //
    // Demurrage: container sitting inside port terminal beyond free days.
    // Detention: container at customer premises beyond free days.
    // Both calculated the same way — just depends on which gate_in_ms you use.
    //
    // Returns amount owed in the same unit as rate_per_day (e.g. USD cents).

    public fun calculate_demurrage(
        gate_in_ms: u64,
        free_days: u64,
        rate_per_day: u64,
        current_ms: u64,
    ): u64 {
        let free_period_ms = free_days * 86_400_000;
        if (current_ms <= gate_in_ms + free_period_ms) {
            0
        } else {
            let overdue_ms = current_ms - gate_in_ms - free_period_ms;
            let days = overdue_ms / 86_400_000;
            days * rate_per_day
        }
    }

    // ── Getters ───────────────────────────────────────────────────────────────

    public fun get_iso_id(c: &Container): String          { c.iso_id }
    public fun get_size_type(c: &Container): String       { c.size_type }
    public fun get_status(c: &Container): u8              { c.status }
    public fun get_current_location(c: &Container): String { c.current_location }
    public fun get_last_event_ms(c: &Container): u64      { c.last_event_ms }

    public fun status_empty(): u8           { STATUS_EMPTY }
    public fun status_stuffed(): u8         { STATUS_STUFFED }
    public fun status_gate_in(): u8         { STATUS_GATE_IN }
    public fun status_on_vessel(): u8       { STATUS_ON_VESSEL }
    public fun status_discharged(): u8      { STATUS_DISCHARGED }
    public fun status_customs_cleared(): u8 { STATUS_CUSTOMS_CLEARED }
    public fun status_gate_out(): u8        { STATUS_GATE_OUT }
    public fun status_returned(): u8        { STATUS_RETURNED }

    // ── Test helpers ──────────────────────────────────────────────────────────

    #[test_only]
    public fun destroy_for_testing(c: Container) {
        let Container {
            id, iso_id: _, size_type: _, operator_name: _, port_of_registration: _,
            manufactured_year: _, current_location: _, status: _, last_event_ms: _,
        } = c;
        sui::object::delete(id);
    }
}
