module logioracle::cmr_note {
    use std::string::String;

    // ── Error codes ───────────────────────────────────────────────────────────
    const ENotCarrier: u64 = 1;
    const ENotRecipient: u64 = 2;
    const EInvalidTransition: u64 = 3;

    // ── Status ────────────────────────────────────────────────────────────────
    const STATUS_ISSUED: u8 = 0;       // sender created
    const STATUS_CARRIER_ACCEPTED: u8 = 1; // carrier signs — takes custody
    const STATUS_IN_TRANSIT: u8 = 2;
    const STATUS_DELIVERED: u8 = 3;    // recipient confirms
    const STATUS_DISPUTED: u8 = 4;     // damage / shortage claim

    // ── Object ────────────────────────────────────────────────────────────────
    //
    // CMR Note (Convention on the Contract for the International Carriage of
    // Goods by Road). Used for every international road freight movement.
    // Covers East Africa (COMESA corridor), EU, and Middle East road transport.
    //
    // Three parties: sender, carrier, recipient.
    // Shared so all three can sign at their respective steps.
    //
    // vehicle_registration: truck/trailer plate. Important for customs.

    public struct CMRNote has key, store {
        id: sui::object::UID,
        cmr_number: String,
        sender: address,
        carrier: address,
        recipient: address,
        loading_address: String,   // full address where goods are picked up
        delivery_address: String,  // full address for delivery
        vehicle_registration: String,
        driver_name: String,
        goods_description: String,
        gross_weight_kg: u64,
        number_of_packages: u64,
        special_instructions: String,  // temperature, fragile, hazardous, etc.
        walrus_blob_id: String,
        evidence_hash: String,
        status: u8,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct CMRIssued has copy, drop {
        cmr_number: String,
        sender: address,
        carrier: address,
        recipient: address,
        loading_address: String,
        delivery_address: String,
    }

    public struct CMRCarrierAccepted has copy, drop {
        cmr_number: String,
        carrier: address,
        vehicle_registration: String,
    }

    public struct CMRDelivered has copy, drop {
        cmr_number: String,
        recipient: address,
    }

    public struct CMRDisputed has copy, drop {
        cmr_number: String,
        disputed_by: address,
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    /// Sender (consignor) creates the CMR note and shares it.
    public fun create_and_share(
        cmr_number: String,
        carrier: address,
        recipient: address,
        loading_address: String,
        delivery_address: String,
        vehicle_registration: String,
        driver_name: String,
        goods_description: String,
        gross_weight_kg: u64,
        number_of_packages: u64,
        special_instructions: String,
        walrus_blob_id: String,
        evidence_hash: String,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);
        let cmr = CMRNote {
            id: sui::object::new(ctx),
            cmr_number,
            sender,
            carrier,
            recipient,
            loading_address,
            delivery_address,
            vehicle_registration,
            driver_name,
            goods_description,
            gross_weight_kg,
            number_of_packages,
            special_instructions,
            walrus_blob_id,
            evidence_hash,
            status: STATUS_ISSUED,
        };

        sui::event::emit(CMRIssued {
            cmr_number: cmr.cmr_number,
            sender,
            carrier: cmr.carrier,
            recipient: cmr.recipient,
            loading_address: cmr.loading_address,
            delivery_address: cmr.delivery_address,
        });

        sui::transfer::share_object(cmr);
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /// Carrier accepts custody of goods — takes legal responsibility.
    public fun carrier_accept(
        cmr: &mut CMRNote,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == cmr.carrier, ENotCarrier);
        assert!(cmr.status == STATUS_ISSUED, EInvalidTransition);
        cmr.status = STATUS_CARRIER_ACCEPTED;
        sui::event::emit(CMRCarrierAccepted {
            cmr_number: cmr.cmr_number,
            carrier: cmr.carrier,
            vehicle_registration: cmr.vehicle_registration,
        });
    }

    /// Carrier marks goods in transit (departed loading address).
    public fun mark_in_transit(
        cmr: &mut CMRNote,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == cmr.carrier, ENotCarrier);
        assert!(cmr.status == STATUS_CARRIER_ACCEPTED, EInvalidTransition);
        cmr.status = STATUS_IN_TRANSIT;
    }

    /// Recipient confirms delivery — proof of delivery on-chain.
    public fun confirm_delivery(
        cmr: &mut CMRNote,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == cmr.recipient, ENotRecipient);
        assert!(cmr.status == STATUS_IN_TRANSIT, EInvalidTransition);
        cmr.status = STATUS_DELIVERED;
        sui::event::emit(CMRDelivered {
            cmr_number: cmr.cmr_number,
            recipient: cmr.recipient,
        });
    }

    /// Recipient raises a damage or shortage claim.
    public fun raise_dispute(
        cmr: &mut CMRNote,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == cmr.recipient, ENotRecipient);
        assert!(cmr.status == STATUS_IN_TRANSIT || cmr.status == STATUS_DELIVERED, EInvalidTransition);
        cmr.status = STATUS_DISPUTED;
        sui::event::emit(CMRDisputed {
            cmr_number: cmr.cmr_number,
            disputed_by: cmr.recipient,
        });
    }

    // ── Getters ───────────────────────────────────────────────────────────────

    public fun get_cmr_number(c: &CMRNote): String           { c.cmr_number }
    public fun get_status(c: &CMRNote): u8                   { c.status }
    public fun get_sender(c: &CMRNote): address              { c.sender }
    public fun get_carrier(c: &CMRNote): address             { c.carrier }
    public fun get_recipient(c: &CMRNote): address           { c.recipient }
    public fun get_vehicle_registration(c: &CMRNote): String { c.vehicle_registration }
    public fun get_gross_weight_kg(c: &CMRNote): u64         { c.gross_weight_kg }

    public fun status_issued(): u8           { STATUS_ISSUED }
    public fun status_carrier_accepted(): u8 { STATUS_CARRIER_ACCEPTED }
    public fun status_in_transit(): u8       { STATUS_IN_TRANSIT }
    public fun status_delivered(): u8        { STATUS_DELIVERED }
    public fun status_disputed(): u8         { STATUS_DISPUTED }

    // ── Test helpers ──────────────────────────────────────────────────────────

    #[test_only]
    public fun create_for_testing(
        cmr_number: String,
        carrier: address,
        recipient: address,
        ctx: &mut sui::tx_context::TxContext
    ): CMRNote {
        let sender = sui::tx_context::sender(ctx);
        CMRNote {
            id: sui::object::new(ctx),
            cmr_number,
            sender,
            carrier,
            recipient,
            loading_address: b"Nairobi ICD, Kenya".to_string(),
            delivery_address: b"Hamburg Port, Germany".to_string(),
            vehicle_registration: b"KDD 001G".to_string(),
            driver_name: b"Test Driver".to_string(),
            goods_description: b"General cargo".to_string(),
            gross_weight_kg: 22000,
            number_of_packages: 100,
            special_instructions: b"Handle with care".to_string(),
            walrus_blob_id: b"walrus-test".to_string(),
            evidence_hash: b"sha256:test".to_string(),
            status: STATUS_ISSUED,
        }
    }

    #[test_only]
    public fun destroy_for_testing(c: CMRNote) {
        let CMRNote {
            id, cmr_number: _, sender: _, carrier: _, recipient: _, loading_address: _,
            delivery_address: _, vehicle_registration: _, driver_name: _, goods_description: _,
            gross_weight_kg: _, number_of_packages: _, special_instructions: _,
            walrus_blob_id: _, evidence_hash: _, status: _,
        } = c;
        sui::object::delete(id);
    }
}
