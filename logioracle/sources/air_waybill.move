module logioracle::air_waybill {
    use std::string::String;

    // ── Error codes ───────────────────────────────────────────────────────────
    const EInvalidTransition: u64 = 1;

    // ── AWB type ──────────────────────────────────────────────────────────────
    const TYPE_MAWB: u8 = 0;  // Master AWB — issued by airline
    const TYPE_HAWB: u8 = 1;  // House AWB — issued by freight forwarder

    // ── Status ────────────────────────────────────────────────────────────────
    const STATUS_ISSUED: u8 = 0;
    const STATUS_ACCEPTED: u8 = 1;   // cargo accepted at origin airport
    const STATUS_DEPARTED: u8 = 2;
    const STATUS_ARRIVED: u8 = 3;    // at destination airport
    const STATUS_CUSTOMS_CLEARED: u8 = 4;
    const STATUS_DELIVERED: u8 = 5;

    // ── Object ────────────────────────────────────────────────────────────────
    //
    // Air Waybill: the air freight equivalent of a Bill of Lading.
    // KEY DIFFERENCE: non-negotiable. Cannot be endorsed or transferred.
    // Delivery is always to the named consignee — no "to order" in air freight.
    //
    // The carrier (airline or freight forwarder) owns and updates this object.
    // shipper and consignee are stored as addresses but ownership does not
    // transfer to them — unlike BL.
    //
    // MAWB: airline to airline / forwarder (big picture)
    // HAWB: freight forwarder to shipper (house level, inside MAWB)

    public struct AirWaybill has key, store {
        id: sui::object::UID,
        awb_number: String,         // 11 digits: 3-digit airline prefix + 8 digits
        awb_type: u8,               // TYPE_MAWB or TYPE_HAWB
        airline: String,
        flight_number: String,
        origin_airport: String,     // IATA code: NBO, LHR, DXB
        destination_airport: String,
        shipper: address,
        consignee: address,
        goods_description: String,
        gross_weight_grams: u64,
        chargeable_weight_grams: u64, // may differ due to volumetric weight
        declared_value_cents: u64,
        special_handling: String,   // LIVE, PER (perishables), DGR, VAL, etc.
        walrus_blob_id: String,
        evidence_hash: String,
        status: u8,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct AWBIssued has copy, drop {
        awb_number: String,
        awb_type: u8,
        airline: String,
        shipper: address,
        consignee: address,
        origin_airport: String,
        destination_airport: String,
        gross_weight_grams: u64,
    }

    public struct AWBStatusUpdated has copy, drop {
        awb_number: String,
        old_status: u8,
        new_status: u8,
        updated_by: address,
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    /// Airline or freight forwarder issues an AWB.
    /// Carrier (caller) retains ownership — AWB is non-negotiable.
    public fun issue(
        awb_number: String,
        awb_type: u8,
        airline: String,
        flight_number: String,
        origin_airport: String,
        destination_airport: String,
        shipper: address,
        consignee: address,
        goods_description: String,
        gross_weight_grams: u64,
        chargeable_weight_grams: u64,
        declared_value_cents: u64,
        special_handling: String,
        walrus_blob_id: String,
        evidence_hash: String,
        ctx: &mut sui::tx_context::TxContext
    ): AirWaybill {
        let issuer = sui::tx_context::sender(ctx);
        let awb = AirWaybill {
            id: sui::object::new(ctx),
            awb_number,
            awb_type,
            airline,
            flight_number,
            origin_airport,
            destination_airport,
            shipper,
            consignee,
            goods_description,
            gross_weight_grams,
            chargeable_weight_grams,
            declared_value_cents,
            special_handling,
            walrus_blob_id,
            evidence_hash,
            status: STATUS_ISSUED,
        };

        sui::event::emit(AWBIssued {
            awb_number: awb.awb_number,
            awb_type: awb.awb_type,
            airline: awb.airline,
            shipper: awb.shipper,
            consignee: awb.consignee,
            origin_airport: awb.origin_airport,
            destination_airport: awb.destination_airport,
            gross_weight_grams: awb.gross_weight_grams,
        });

        // Carrier retains ownership — unlike BL, this is not transferred to consignee
        let _ = issuer;
        awb
    }

    // ── Lifecycle (carrier updates only) ──────────────────────────────────────

    fun update_status(awb: &mut AirWaybill, new_status: u8, ctx: &sui::tx_context::TxContext) {
        let old_status = awb.status;
        assert!(new_status == old_status + 1, EInvalidTransition);
        awb.status = new_status;
        sui::event::emit(AWBStatusUpdated {
            awb_number: awb.awb_number,
            old_status,
            new_status,
            updated_by: sui::tx_context::sender(ctx),
        });
    }

    public fun accept_cargo(awb: &mut AirWaybill, ctx: &sui::tx_context::TxContext) {
        update_status(awb, STATUS_ACCEPTED, ctx);
    }

    public fun depart(awb: &mut AirWaybill, ctx: &sui::tx_context::TxContext) {
        update_status(awb, STATUS_DEPARTED, ctx);
    }

    public fun arrive(awb: &mut AirWaybill, ctx: &sui::tx_context::TxContext) {
        update_status(awb, STATUS_ARRIVED, ctx);
    }

    public fun clear_customs(awb: &mut AirWaybill, ctx: &sui::tx_context::TxContext) {
        update_status(awb, STATUS_CUSTOMS_CLEARED, ctx);
    }

    public fun deliver(awb: &mut AirWaybill, ctx: &sui::tx_context::TxContext) {
        update_status(awb, STATUS_DELIVERED, ctx);
    }

    // ── Getters ───────────────────────────────────────────────────────────────

    public fun get_awb_number(awb: &AirWaybill): String        { awb.awb_number }
    public fun get_awb_type(awb: &AirWaybill): u8              { awb.awb_type }
    public fun get_status(awb: &AirWaybill): u8                { awb.status }
    public fun get_airline(awb: &AirWaybill): String           { awb.airline }
    public fun get_shipper(awb: &AirWaybill): address          { awb.shipper }
    public fun get_consignee(awb: &AirWaybill): address        { awb.consignee }
    public fun get_origin_airport(awb: &AirWaybill): String    { awb.origin_airport }
    public fun get_destination_airport(awb: &AirWaybill): String { awb.destination_airport }
    public fun get_gross_weight_grams(awb: &AirWaybill): u64   { awb.gross_weight_grams }

    public fun type_mawb(): u8          { TYPE_MAWB }
    public fun type_hawb(): u8          { TYPE_HAWB }
    public fun status_issued(): u8      { STATUS_ISSUED }
    public fun status_accepted(): u8    { STATUS_ACCEPTED }
    public fun status_departed(): u8    { STATUS_DEPARTED }
    public fun status_arrived(): u8     { STATUS_ARRIVED }
    public fun status_delivered(): u8   { STATUS_DELIVERED }

    // ── Test helpers ──────────────────────────────────────────────────────────

    #[test_only]
    public fun destroy_for_testing(awb: AirWaybill) {
        let AirWaybill {
            id, awb_number: _, awb_type: _, airline: _, flight_number: _,
            origin_airport: _, destination_airport: _, shipper: _, consignee: _,
            goods_description: _, gross_weight_grams: _, chargeable_weight_grams: _,
            declared_value_cents: _, special_handling: _, walrus_blob_id: _,
            evidence_hash: _, status: _,
        } = awb;
        sui::object::delete(id);
    }
}
