module logioracle::shipment {
    use std::string::String;

    // ── Error codes ───────────────────────────────────────────────────────────
    const EInvalidStatus: u64 = 0;
    const EInvalidStatusTransition: u64 = 1;
    const ENotSender: u64 = 2;
    const ENotReceiver: u64 = 3;

    // ── Object ────────────────────────────────────────────────────────────────
    //
    // sender   — the exporter who created the proof. Can mark IN_TRANSIT.
    // receiver — the importer / bank / verifier. Must confirm DELIVERED.
    //
    // When both are the same address (self-proof / testing) all transitions
    // are allowed from a single key, matching the old single-owner behaviour.

    public struct Shipment has key, store {
        id: sui::object::UID,
        shipment_id: String,
        proof_type: String,
        origin: String,
        destination: String,
        sender: address,
        receiver: address,
        walrus_blob_id: String,
        evidence_hash: String,
        status: String,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct ShipmentCreated has copy, drop {
        shipment_id: String,
        proof_type: String,
        walrus_blob_id: String,
        evidence_hash: String,
        status: String,
        sender: address,
        receiver: address,
    }

    public struct ShipmentStatusUpdated has copy, drop {
        shipment_id: String,
        old_status: String,
        new_status: String,
        updated_by: address,
    }

    public struct ShipmentEvidenceUpdated has copy, drop {
        shipment_id: String,
        walrus_blob_id: String,
        evidence_hash: String,
        updated_by: address,
    }

    // ── Constructors ──────────────────────────────────────────────────────────

    /// Internal constructor. receiver == sender means single-party / self-proof.
    public fun create(
        shipment_id: String,
        proof_type: String,
        origin: String,
        destination: String,
        walrus_blob_id: String,
        evidence_hash: String,
        receiver: address,
        ctx: &mut sui::tx_context::TxContext
    ): Shipment {
        let sender = sui::tx_context::sender(ctx);
        let shipment = Shipment {
            id: sui::object::new(ctx),
            shipment_id,
            proof_type,
            origin,
            destination,
            sender,
            receiver,
            walrus_blob_id,
            evidence_hash,
            status: b"CREATED".to_string(),
        };

        sui::event::emit(ShipmentCreated {
            shipment_id: shipment.shipment_id,
            proof_type: shipment.proof_type,
            walrus_blob_id: shipment.walrus_blob_id,
            evidence_hash: shipment.evidence_hash,
            status: shipment.status,
            sender: shipment.sender,
            receiver: shipment.receiver,
        });

        shipment
    }

    /// Single-party / CLI flow.
    /// Recipient owns the object; receiver defaults to recipient.
    public fun create_and_transfer(
        shipment_id: String,
        proof_type: String,
        origin: String,
        destination: String,
        walrus_blob_id: String,
        evidence_hash: String,
        recipient: address,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let shipment = create(
            shipment_id, proof_type, origin, destination,
            walrus_blob_id, evidence_hash,
            recipient, // receiver = recipient (single-party)
            ctx
        );
        sui::transfer::public_transfer(shipment, recipient);
    }

    /// Two-party flow. Creates a shared object so both sender and receiver
    /// can submit transactions against it without owning it.
    public fun create_and_share(
        shipment_id: String,
        proof_type: String,
        origin: String,
        destination: String,
        walrus_blob_id: String,
        evidence_hash: String,
        receiver: address,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let shipment = create(
            shipment_id, proof_type, origin, destination,
            walrus_blob_id, evidence_hash,
            receiver,
            ctx
        );
        sui::transfer::share_object(shipment);
    }

    // ── Status transitions ────────────────────────────────────────────────────

    /// General update — for owned (single-party) shipments.
    /// Ownership of the object is the authorisation check.
    public fun update_status(shipment: &mut Shipment, new_status: String) {
        let old_status = shipment.status;
        assert!(is_valid_status(&new_status), EInvalidStatus);
        assert!(is_valid_status_transition(&old_status, &new_status), EInvalidStatusTransition);

        shipment.status = new_status;
        sui::event::emit(ShipmentStatusUpdated {
            shipment_id: shipment.shipment_id,
            old_status,
            new_status: shipment.status,
            updated_by: shipment.sender,
        });
    }

    /// Sender marks goods dispatched. Only the sender address may call this.
    public fun mark_in_transit(
        shipment: &mut Shipment,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == shipment.sender, ENotSender);
        let old_status = shipment.status;
        assert!(is_valid_status_transition(&old_status, &b"IN_TRANSIT".to_string()), EInvalidStatusTransition);

        shipment.status = b"IN_TRANSIT".to_string();
        sui::event::emit(ShipmentStatusUpdated {
            shipment_id: shipment.shipment_id,
            old_status,
            new_status: shipment.status,
            updated_by: sui::tx_context::sender(ctx),
        });
    }

    /// Receiver confirms delivery. Only the receiver address may call this.
    /// This is the signature that makes the proof two-party.
    public fun confirm_delivery(
        shipment: &mut Shipment,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == shipment.receiver, ENotReceiver);
        let old_status = shipment.status;
        assert!(is_valid_status_transition(&old_status, &b"DELIVERED".to_string()), EInvalidStatusTransition);

        shipment.status = b"DELIVERED".to_string();
        sui::event::emit(ShipmentStatusUpdated {
            shipment_id: shipment.shipment_id,
            old_status,
            new_status: shipment.status,
            updated_by: sui::tx_context::sender(ctx),
        });
    }

    // ── Evidence update ───────────────────────────────────────────────────────

    public fun update_evidence(
        shipment: &mut Shipment,
        walrus_blob_id: String,
        evidence_hash: String,
        ctx: &sui::tx_context::TxContext
    ) {
        let caller = sui::tx_context::sender(ctx);
        assert!(caller == shipment.sender || caller == shipment.receiver, ENotSender);

        shipment.walrus_blob_id = walrus_blob_id;
        shipment.evidence_hash = evidence_hash;
        sui::event::emit(ShipmentEvidenceUpdated {
            shipment_id: shipment.shipment_id,
            walrus_blob_id: shipment.walrus_blob_id,
            evidence_hash: shipment.evidence_hash,
            updated_by: caller,
        });
    }

    // ── Validation helpers ────────────────────────────────────────────────────

    public fun is_valid_status(status: &String): bool {
        *status == b"CREATED".to_string()
            || *status == b"IN_TRANSIT".to_string()
            || *status == b"DELIVERED".to_string()
    }

    fun is_valid_status_transition(old_status: &String, new_status: &String): bool {
        if (*old_status == *new_status) {
            true
        } else if (*old_status == b"CREATED".to_string()) {
            *new_status == b"IN_TRANSIT".to_string()
                || *new_status == b"DELIVERED".to_string()
        } else if (*old_status == b"IN_TRANSIT".to_string()) {
            *new_status == b"DELIVERED".to_string()
        } else {
            false
        }
    }

    // ── Getters ───────────────────────────────────────────────────────────────

    public fun get_proof_type(shipment: &Shipment): String  { shipment.proof_type }
    public fun get_status(shipment: &Shipment): String      { shipment.status }
    public fun get_walrus_blob_id(shipment: &Shipment): String { shipment.walrus_blob_id }
    public fun get_evidence_hash(shipment: &Shipment): String  { shipment.evidence_hash }
    public fun get_sender(shipment: &Shipment): address     { shipment.sender }
    public fun get_receiver(shipment: &Shipment): address   { shipment.receiver }

    // ── Test helpers ──────────────────────────────────────────────────────────

    #[test_only]
    public fun assert_valid_status_for_testing(status: String) {
        assert!(is_valid_status(&status), EInvalidStatus);
    }

    #[test_only]
    public fun assert_valid_status_transition_for_testing(old: String, new: String) {
        assert!(is_valid_status_transition(&old, &new), EInvalidStatusTransition);
    }

    #[test_only]
    public fun destroy_for_testing(shipment: Shipment) {
        let Shipment {
            id, shipment_id: _, proof_type: _, origin: _, destination: _,
            sender: _, receiver: _, walrus_blob_id: _, evidence_hash: _, status: _,
        } = shipment;
        sui::object::delete(id);
    }
}
