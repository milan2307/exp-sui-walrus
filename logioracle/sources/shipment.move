module logioracle::shipment {
    use std::string::String;

    const EInvalidStatus: u64 = 0;
    const EInvalidStatusTransition: u64 = 1;

    public struct Shipment has key, store {
        id: sui::object::UID,
        shipment_id: String,
        proof_type: String,
        origin: String,
        destination: String,
        walrus_blob_id: String,
        evidence_hash: String,
        status: String,
        owner: address,
    }

    public struct ShipmentCreated has copy, drop {
        shipment_id: String,
        proof_type: String,
        walrus_blob_id: String,
        evidence_hash: String,
        status: String,
        owner: address,
    }

    public struct ShipmentStatusUpdated has copy, drop {
        shipment_id: String,
        old_status: String,
        new_status: String,
        owner: address,
    }

    public struct ShipmentEvidenceUpdated has copy, drop {
        shipment_id: String,
        walrus_blob_id: String,
        evidence_hash: String,
        owner: address,
    }

    public fun create(
        shipment_id: String,
        proof_type: String,
        origin: String,
        destination: String,
        walrus_blob_id: String,
        evidence_hash: String,
        ctx: &mut sui::tx_context::TxContext
    ): Shipment {
        let shipment = Shipment {
            id: sui::object::new(ctx),
            shipment_id,
            proof_type,
            origin,
            destination,
            walrus_blob_id,
            evidence_hash,
            status: b"CREATED".to_string(),
            owner: sui::tx_context::sender(ctx),
        };

        sui::event::emit(ShipmentCreated {
            shipment_id: shipment.shipment_id,
            proof_type: shipment.proof_type,
            walrus_blob_id: shipment.walrus_blob_id,
            evidence_hash: shipment.evidence_hash,
            status: shipment.status,
            owner: shipment.owner,
        });

        shipment
    }

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
            shipment_id,
            proof_type,
            origin,
            destination,
            walrus_blob_id,
            evidence_hash,
            ctx
        );
        sui::transfer::public_transfer(shipment, recipient);
    }

    public fun update_status(shipment: &mut Shipment, new_status: String) {
        let old_status = shipment.status;
        assert!(is_valid_status(&new_status), EInvalidStatus);
        assert!(is_valid_status_transition(&old_status, &new_status), EInvalidStatusTransition);

        shipment.status = new_status;
        sui::event::emit(ShipmentStatusUpdated {
            shipment_id: shipment.shipment_id,
            old_status,
            new_status: shipment.status,
            owner: shipment.owner,
        });
    }

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

    #[test_only]
    public fun assert_valid_status_for_testing(status: String) {
        assert!(is_valid_status(&status), EInvalidStatus);
    }

    #[test_only]
    public fun assert_valid_status_transition_for_testing(
        old_status: String,
        new_status: String
    ) {
        assert!(is_valid_status_transition(&old_status, &new_status), EInvalidStatusTransition);
    }

    public fun update_evidence(
        shipment: &mut Shipment,
        walrus_blob_id: String,
        evidence_hash: String
    ) {
        shipment.walrus_blob_id = walrus_blob_id;
        shipment.evidence_hash = evidence_hash;
        sui::event::emit(ShipmentEvidenceUpdated {
            shipment_id: shipment.shipment_id,
            walrus_blob_id: shipment.walrus_blob_id,
            evidence_hash: shipment.evidence_hash,
            owner: shipment.owner,
        });
    }

    public fun get_proof_type(shipment: &Shipment): String {
        shipment.proof_type
    }

    public fun get_status(shipment: &Shipment): String {
        shipment.status
    }

    public fun get_walrus_blob_id(shipment: &Shipment): String {
        shipment.walrus_blob_id
    }

    public fun get_evidence_hash(shipment: &Shipment): String {
        shipment.evidence_hash
    }

    #[test_only]
    public fun destroy_for_testing(shipment: Shipment) {
        let Shipment {
            id,
            shipment_id: _,
            proof_type: _,
            origin: _,
            destination: _,
            walrus_blob_id: _,
            evidence_hash: _,
            status: _,
            owner: _,
        } = shipment;
        sui::object::delete(id);
    }
}
