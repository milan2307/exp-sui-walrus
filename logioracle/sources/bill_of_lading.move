module logioracle::bill_of_lading {
    use std::string::String;

    // ── Error codes ───────────────────────────────────────────────────────────
    const EAlreadySurrendered: u64 = 0;

    // ── Status constants ──────────────────────────────────────────────────────
    // u8 instead of String — cheaper gas, no invalid-string bugs
    const STATUS_ISSUED: u8 = 0;
    const STATUS_ENDORSED: u8 = 1;
    const STATUS_SURRENDERED: u8 = 2;

    // ── Object ────────────────────────────────────────────────────────────────
    //
    // A Bill of Lading is a negotiable title document: whoever holds it owns
    // the cargo. Modelled as an owned NFT so Sui's object model enforces
    // "only the holder can endorse or surrender" — no extra access check needed.
    //
    // shipper   — original issuer, stamped at creation, never changes
    // The current Sui owner is always the current BL holder.
    // Endorsement = transfer to a new address.
    // Surrender   = destruction of the object (cargo released at destination).

    public struct BillOfLading has key, store {
        id: sui::object::UID,
        bl_number: String,           // e.g. MSCU-2026-001
        vessel: String,              // vessel name
        voyage: String,              // voyage number
        port_of_loading: String,     // e.g. Mombasa
        port_of_discharge: String,   // e.g. Felixstowe
        shipper: address,            // original issuer — never changes
        notify_party: String,        // name / address for arrival notification
        cargo_description: String,   // brief description of goods
        container_count: u64,        // number of containers
        walrus_blob_id: String,      // Walrus reference to the full BL document
        evidence_hash: String,       // SHA-256 of that document
        status: u8,                  // STATUS_ISSUED | STATUS_ENDORSED | STATUS_SURRENDERED
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct BLIssued has copy, drop {
        bl_number: String,
        shipper: address,
        consignee: address,
        vessel: String,
        port_of_loading: String,
        port_of_discharge: String,
        container_count: u64,
        walrus_blob_id: String,
        evidence_hash: String,
    }

    public struct BLEndorsed has copy, drop {
        bl_number: String,
        from: address,
        to: address,
    }

    public struct BLSurrendered has copy, drop {
        bl_number: String,
        holder: address,
        port_of_discharge: String,
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    /// Shipper issues a BL and transfers it directly to the consignee.
    /// The consignee becomes the first holder.
    public fun issue(
        bl_number: String,
        vessel: String,
        voyage: String,
        port_of_loading: String,
        port_of_discharge: String,
        consignee: address,
        notify_party: String,
        cargo_description: String,
        container_count: u64,
        walrus_blob_id: String,
        evidence_hash: String,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let shipper = sui::tx_context::sender(ctx);
        let bl = BillOfLading {
            id: sui::object::new(ctx),
            bl_number,
            vessel,
            voyage,
            port_of_loading,
            port_of_discharge,
            shipper,
            notify_party,
            cargo_description,
            container_count,
            walrus_blob_id,
            evidence_hash,
            status: STATUS_ISSUED,
        };

        sui::event::emit(BLIssued {
            bl_number: bl.bl_number,
            shipper,
            consignee,
            vessel: bl.vessel,
            port_of_loading: bl.port_of_loading,
            port_of_discharge: bl.port_of_discharge,
            container_count: bl.container_count,
            walrus_blob_id: bl.walrus_blob_id,
            evidence_hash: bl.evidence_hash,
        });

        sui::transfer::public_transfer(bl, consignee);
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /// Current holder endorses (transfers) the BL to a new holder.
    /// Real-world use: consignee endorses to their bank for LC settlement;
    /// bank endorses back to consignee once payment clears.
    /// Sui ownership enforces "only holder can call" — no address check needed.
    public fun endorse(
        mut bl: BillOfLading,
        new_holder: address,
        ctx: &mut sui::tx_context::TxContext
    ) {
        assert!(bl.status != STATUS_SURRENDERED, EAlreadySurrendered);

        let from = sui::tx_context::sender(ctx);
        sui::event::emit(BLEndorsed {
            bl_number: bl.bl_number,
            from,
            to: new_holder,
        });

        bl.status = STATUS_ENDORSED;
        sui::transfer::public_transfer(bl, new_holder);
    }

    /// Holder surrenders the BL at the port of discharge.
    /// Cargo is released. BL is destroyed — like handing in the original paper.
    public fun surrender(
        bl: BillOfLading,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(bl.status != STATUS_SURRENDERED, EAlreadySurrendered);

        let holder = sui::tx_context::sender(ctx);
        sui::event::emit(BLSurrendered {
            bl_number: bl.bl_number,
            holder,
            port_of_discharge: bl.port_of_discharge,
        });

        let BillOfLading {
            id, bl_number: _, vessel: _, voyage: _, port_of_loading: _,
            port_of_discharge: _, shipper: _, notify_party: _, cargo_description: _,
            container_count: _, walrus_blob_id: _, evidence_hash: _, status: _,
        } = bl;
        sui::object::delete(id);
    }

    // ── Getters ───────────────────────────────────────────────────────────────

    public fun get_bl_number(bl: &BillOfLading): String       { bl.bl_number }
    public fun get_vessel(bl: &BillOfLading): String           { bl.vessel }
    public fun get_status(bl: &BillOfLading): u8               { bl.status }
    public fun get_shipper(bl: &BillOfLading): address         { bl.shipper }
    public fun get_port_of_loading(bl: &BillOfLading): String  { bl.port_of_loading }
    public fun get_port_of_discharge(bl: &BillOfLading): String { bl.port_of_discharge }
    public fun get_walrus_blob_id(bl: &BillOfLading): String   { bl.walrus_blob_id }
    public fun get_evidence_hash(bl: &BillOfLading): String    { bl.evidence_hash }
    public fun get_container_count(bl: &BillOfLading): u64     { bl.container_count }

    // ── Test helpers ──────────────────────────────────────────────────────────

    #[test_only]
    public fun status_issued(): u8 { STATUS_ISSUED }
    #[test_only]
    public fun status_endorsed(): u8 { STATUS_ENDORSED }
    #[test_only]
    public fun status_surrendered(): u8 { STATUS_SURRENDERED }

    #[test_only]
    public fun destroy_for_testing(bl: BillOfLading) {
        let BillOfLading {
            id, bl_number: _, vessel: _, voyage: _, port_of_loading: _,
            port_of_discharge: _, shipper: _, notify_party: _, cargo_description: _,
            container_count: _, walrus_blob_id: _, evidence_hash: _, status: _,
        } = bl;
        sui::object::delete(id);
    }
}
