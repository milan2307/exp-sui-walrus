module logioracle::shipment {
    use std::string::String;

    public struct Shipment has key, store {
        id: sui::object::UID,
        shipment_id: String,
        origin: String,
        destination: String,
        walrus_blob_id: String,
        status: String,
        owner: address,
    }

    public fun create(
        shipment_id: String,
        origin: String,
        destination: String,
        walrus_blob_id: String,
        ctx: &mut sui::tx_context::TxContext
    ): Shipment {
        Shipment {
            id: sui::object::new(ctx),
            shipment_id,
            origin,
            destination,
            walrus_blob_id,
            status: b"CREATED".to_string(),
            owner: sui::tx_context::sender(ctx),
        }
    }

    public fun update_status(shipment: &mut Shipment, new_status: String) {
        shipment.status = new_status;
    }

    public fun get_status(shipment: &Shipment): String {
        shipment.status
    }

    public fun get_walrus_blob_id(shipment: &Shipment): String {
        shipment.walrus_blob_id
    }

    #[test_only]
    public fun destroy_for_testing(shipment: Shipment) {
        let Shipment {
            id,
            shipment_id: _,
            origin: _,
            destination: _,
            walrus_blob_id: _,
            status: _,
            owner: _,
        } = shipment;
        sui::object::delete(id);
    }
}
