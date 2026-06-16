#[test_only]
module logioracle::logioracle_tests;

use logioracle::shipment;

#[test]
fun creates_and_updates_shipment_proof() {
    let mut ctx = sui::test_scenario::begin(@0xA);
    let mut shipment = shipment::create(
        b"SHIP-001".to_string(),
        b"Nairobi".to_string(),
        b"Mombasa".to_string(),
        b"walrus-blob-test-001".to_string(),
        sui::test_scenario::ctx(&mut ctx)
    );

    assert!(shipment::get_status(&shipment) == b"CREATED".to_string());
    assert!(shipment::get_walrus_blob_id(&shipment) == b"walrus-blob-test-001".to_string());

    shipment::update_status(&mut shipment, b"DELIVERED".to_string());
    assert!(shipment::get_status(&shipment) == b"DELIVERED".to_string());

    shipment::destroy_for_testing(shipment);
    sui::test_scenario::end(ctx);
}
