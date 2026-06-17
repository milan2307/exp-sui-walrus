module logioracle::bill_of_lading {
    use std::string::String;

    // ── Error codes ───────────────────────────────────────────────────────────
    const EAlreadySurrendered: u64 = 0;

    // ── Status ────────────────────────────────────────────────────────────────
    const STATUS_ISSUED: u8 = 0;
    const STATUS_ENDORSED: u8 = 1;
    const STATUS_SURRENDERED: u8 = 2;

    // ── BL Type (DCSA eBL 3.0 Transport Document Type Code) ──────────────────
    const BL_TYPE_STRAIGHT: u8 = 0; // non-negotiable, named consignee only
    const BL_TYPE_TO_ORDER: u8 = 1; // negotiable, endorsable to order
    const BL_TYPE_BEARER: u8 = 2;   // negotiable, whoever holds it

    // ── Freight Terms ─────────────────────────────────────────────────────────
    const FREIGHT_PREPAID: u8 = 0;  // shipper pays ocean freight
    const FREIGHT_COLLECT: u8 = 1;  // consignee pays at destination

    // ── Object ────────────────────────────────────────────────────────────────
    //
    // DCSA eBL 3.0 compliant Bill of Lading as a Sui owned NFT.
    // Holder rights enforced at protocol level — only the Sui object owner
    // can endorse or surrender. No platform can override this.
    //
    // Privacy layer (Seal threshold encryption):
    //   The full DCSA document is encrypted client-side with Sui's Seal service
    //   before upload to Walrus. Only parties in the seal_id AllowList can
    //   request decryption key shares. Competitors see the hash — nothing else.
    //
    //   seal_id      — Sui object ID of the seal_policy::AllowList for this BL.
    //                  Empty string if document is stored unencrypted.
    //   is_encrypted — true if walrus_blob_id points to a Seal-encrypted blob.
    //
    // Fields follow DCSA eBL 3.0 terminology. UN/LOCODE recommended for ports.

    public struct BillOfLading has key, store {
        id: sui::object::UID,
        bl_number: String,              // DCSA: transportDocumentReference
        bl_type: u8,                    // DCSA: transportDocumentTypeCode
        carrier_scac: String,           // DCSA: carrierCodeListProvider (MSCU, MAEU, CMDU)
        vessel: String,                 // DCSA: vesselName
        voyage: String,                 // DCSA: carrierExportVoyageNumber
        place_of_receipt: String,       // DCSA: placeOfReceipt (UN/LOCODE, e.g. KE NBO)
        port_of_loading: String,        // DCSA: portOfLoading (UN/LOCODE, e.g. KE MBA)
        port_of_discharge: String,      // DCSA: portOfDischarge (UN/LOCODE, e.g. GB FXT)
        place_of_delivery: String,      // DCSA: placeOfDelivery (UN/LOCODE)
        shipped_on_board_date_ms: u64,  // DCSA: shippedOnBoardDate — legally critical
        shipper: address,               // DCSA: shipper party (Sui address)
        notify_party: String,           // DCSA: notifyParty (name + contact)
        cargo_description: String,      // DCSA: descriptionOfGoods
        hs_code: String,                // DCSA: HSCode (e.g. 0901.11 for green coffee)
        gross_weight_kg: u64,           // DCSA: grossWeight
        container_count: u64,           // DCSA: number of utilized transport equipment
        freight_terms: u8,              // DCSA: freightPaymentTermCode
        walrus_blob_id: String,         // TradeProof: full DCSA JSON doc on Walrus
        evidence_hash: String,          // TradeProof: SHA-256, integrity proof
        seal_id: String,                // TradeProof: seal_policy::AllowList object ID (or "")
        is_encrypted: bool,             // TradeProof: true = walrus_blob_id is Seal-encrypted
        status: u8,
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
        seal_id: String,
        is_encrypted: bool,
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

    /// Shipper issues a DCSA eBL 3.0 compliant BL and transfers it to the consignee.
    /// The consignee becomes the first holder. Use UN/LOCODE for port fields.
    ///
    /// For encrypted BLs: pass the seal_policy::AllowList object ID as seal_id
    /// and set is_encrypted = true. The full document should be encrypted with
    /// Mysten Labs' Seal SDK before upload to Walrus.
    /// For unencrypted BLs (testnet / non-sensitive): pass "" and false.
    public fun issue(
        bl_number: String,
        bl_type: u8,
        carrier_scac: String,
        vessel: String,
        voyage: String,
        place_of_receipt: String,
        port_of_loading: String,
        port_of_discharge: String,
        place_of_delivery: String,
        shipped_on_board_date_ms: u64,
        consignee: address,
        notify_party: String,
        cargo_description: String,
        hs_code: String,
        gross_weight_kg: u64,
        container_count: u64,
        freight_terms: u8,
        walrus_blob_id: String,
        evidence_hash: String,
        seal_id: String,
        is_encrypted: bool,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let shipper = sui::tx_context::sender(ctx);
        let bl = BillOfLading {
            id: sui::object::new(ctx),
            bl_number,
            bl_type,
            carrier_scac,
            vessel,
            voyage,
            place_of_receipt,
            port_of_loading,
            port_of_discharge,
            place_of_delivery,
            shipped_on_board_date_ms,
            shipper,
            notify_party,
            cargo_description,
            hs_code,
            gross_weight_kg,
            container_count,
            freight_terms,
            walrus_blob_id,
            evidence_hash,
            seal_id,
            is_encrypted,
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
            seal_id: bl.seal_id,
            is_encrypted: bl.is_encrypted,
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
            id, bl_number: _, bl_type: _, carrier_scac: _, vessel: _, voyage: _,
            place_of_receipt: _, port_of_loading: _, port_of_discharge: _,
            place_of_delivery: _, shipped_on_board_date_ms: _, shipper: _,
            notify_party: _, cargo_description: _, hs_code: _, gross_weight_kg: _,
            container_count: _, freight_terms: _, walrus_blob_id: _, evidence_hash: _,
            seal_id: _, is_encrypted: _,
            status: _,
        } = bl;
        sui::object::delete(id);
    }

    // ── Getters ───────────────────────────────────────────────────────────────

    public fun get_bl_number(bl: &BillOfLading): String            { bl.bl_number }
    public fun get_bl_type(bl: &BillOfLading): u8                  { bl.bl_type }
    public fun get_carrier_scac(bl: &BillOfLading): String         { bl.carrier_scac }
    public fun get_vessel(bl: &BillOfLading): String               { bl.vessel }
    public fun get_status(bl: &BillOfLading): u8                   { bl.status }
    public fun get_shipper(bl: &BillOfLading): address             { bl.shipper }
    public fun get_place_of_receipt(bl: &BillOfLading): String     { bl.place_of_receipt }
    public fun get_port_of_loading(bl: &BillOfLading): String      { bl.port_of_loading }
    public fun get_port_of_discharge(bl: &BillOfLading): String    { bl.port_of_discharge }
    public fun get_place_of_delivery(bl: &BillOfLading): String    { bl.place_of_delivery }
    public fun get_shipped_on_board_date_ms(bl: &BillOfLading): u64 { bl.shipped_on_board_date_ms }
    public fun get_hs_code(bl: &BillOfLading): String              { bl.hs_code }
    public fun get_gross_weight_kg(bl: &BillOfLading): u64         { bl.gross_weight_kg }
    public fun get_freight_terms(bl: &BillOfLading): u8            { bl.freight_terms }
    public fun get_walrus_blob_id(bl: &BillOfLading): String       { bl.walrus_blob_id }
    public fun get_evidence_hash(bl: &BillOfLading): String        { bl.evidence_hash }
    public fun get_container_count(bl: &BillOfLading): u64         { bl.container_count }
    public fun get_seal_id(bl: &BillOfLading): String              { bl.seal_id }
    public fun get_is_encrypted(bl: &BillOfLading): bool           { bl.is_encrypted }

    // ── Constants (public) ────────────────────────────────────────────────────

    public fun status_issued(): u8      { STATUS_ISSUED }
    public fun status_endorsed(): u8    { STATUS_ENDORSED }
    public fun status_surrendered(): u8 { STATUS_SURRENDERED }
    public fun bl_type_straight(): u8   { BL_TYPE_STRAIGHT }
    public fun bl_type_to_order(): u8   { BL_TYPE_TO_ORDER }
    public fun bl_type_bearer(): u8     { BL_TYPE_BEARER }
    public fun freight_prepaid(): u8    { FREIGHT_PREPAID }
    public fun freight_collect(): u8    { FREIGHT_COLLECT }

    // ── Test helpers ──────────────────────────────────────────────────────────

    #[test_only]
    public fun issue_for_testing(
        bl_number: String,
        _consignee: address,
        port_of_loading: String,
        port_of_discharge: String,
        walrus_blob_id: String,
        evidence_hash: String,
        ctx: &mut sui::tx_context::TxContext
    ): BillOfLading {
        let shipper = sui::tx_context::sender(ctx);
        BillOfLading {
            id: sui::object::new(ctx),
            bl_number,
            bl_type: BL_TYPE_TO_ORDER,
            carrier_scac: b"MSCU".to_string(),
            vessel: b"MSC AURORA".to_string(),
            voyage: b"AW216N".to_string(),
            place_of_receipt: b"KE NBO".to_string(),
            port_of_loading,
            port_of_discharge,
            place_of_delivery: b"GB BHM".to_string(),
            shipped_on_board_date_ms: 1_780_272_000_000,
            shipper,
            notify_party: b"Notify Party Test".to_string(),
            cargo_description: b"Test cargo".to_string(),
            hs_code: b"0901.11".to_string(),
            gross_weight_kg: 21_000,
            container_count: 1,
            freight_terms: FREIGHT_PREPAID,
            walrus_blob_id,
            evidence_hash,
            seal_id: b"".to_string(),
            is_encrypted: false,
            status: STATUS_ISSUED,
        }
    }

    #[test_only]
    public fun destroy_for_testing(bl: BillOfLading) {
        let BillOfLading {
            id, bl_number: _, bl_type: _, carrier_scac: _, vessel: _, voyage: _,
            place_of_receipt: _, port_of_loading: _, port_of_discharge: _,
            place_of_delivery: _, shipped_on_board_date_ms: _, shipper: _,
            notify_party: _, cargo_description: _, hs_code: _, gross_weight_kg: _,
            container_count: _, freight_terms: _, walrus_blob_id: _, evidence_hash: _,
            seal_id: _, is_encrypted: _,
            status: _,
        } = bl;
        sui::object::delete(id);
    }
}
