module logioracle::shipment {
    use std::string::String;

    public struct Shipment has key, store {
        id: sui::object::UID,
        shipment_id: String,
        origin: String,
        destination: String,
        status: String,
        owner: address,
    }

    public fun create(
        shipment_id: String,
        origin: String,
        destination: String,
        ctx: &mut sui::tx_context::TxContext
    ): Shipment {
        Shipment {
            id: sui::object::new(ctx),
            shipment_id,
            origin,
            destination,
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
}
