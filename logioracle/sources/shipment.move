module logioracle::shipment {
    use std::string::String;

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

    public fun create(
        shipment_id: String,
        proof_type: String,
        origin: String,
        destination: String,
        walrus_blob_id: String,
        evidence_hash: String,
        ctx: &mut sui::tx_context::TxContext
    ): Shipment {
        Shipment {
            id: sui::object::new(ctx),
            shipment_id,
            proof_type,
            origin,
            destination,
            walrus_blob_id,
            evidence_hash,
            status: b"CREATED".to_string(),
            owner: sui::tx_context::sender(ctx),
        }
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
        shipment.status = new_status;
    }

    public fun update_evidence(
        shipment: &mut Shipment,
        walrus_blob_id: String,
        evidence_hash: String
    ) {
        shipment.walrus_blob_id = walrus_blob_id;
        shipment.evidence_hash = evidence_hash;
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
