#[test_only]
module logioracle::logioracle_tests;

use logioracle::shipment;

#[test]
fun creates_and_updates_shipment_proof() {
    let mut ctx = sui::test_scenario::begin(@0xA);
    let mut shipment = shipment::create(
        b"SHIP-001".to_string(),
        b"SHIPMENT".to_string(),
        b"Nairobi".to_string(),
        b"Mombasa".to_string(),
        b"walrus-blob-test-001".to_string(),
        b"sha256:test-evidence-001".to_string(),
        sui::test_scenario::ctx(&mut ctx)
    );

    assert!(shipment::get_proof_type(&shipment) == b"SHIPMENT".to_string());
    assert!(shipment::get_status(&shipment) == b"CREATED".to_string());
    assert!(shipment::get_walrus_blob_id(&shipment) == b"walrus-blob-test-001".to_string());
    assert!(shipment::get_evidence_hash(&shipment) == b"sha256:test-evidence-001".to_string());

    shipment::update_status(&mut shipment, b"DELIVERED".to_string());
    assert!(shipment::get_status(&shipment) == b"DELIVERED".to_string());

    shipment::update_evidence(
        &mut shipment,
        b"walrus-blob-test-002".to_string(),
        b"sha256:test-evidence-002".to_string()
    );
    assert!(shipment::get_walrus_blob_id(&shipment) == b"walrus-blob-test-002".to_string());
    assert!(shipment::get_evidence_hash(&shipment) == b"sha256:test-evidence-002".to_string());

    shipment::destroy_for_testing(shipment);
    sui::test_scenario::end(ctx);
}

#[test]
fun entry_creates_and_transfers_shipment_proof() {
    let mut ctx = sui::test_scenario::begin(@0xA);

    shipment::create_and_transfer(
        b"SHIP-CLI-001".to_string(),
        b"SHIPMENT".to_string(),
        b"Nairobi".to_string(),
        b"Mombasa".to_string(),
        b"walrus-blob-cli-001".to_string(),
        b"sha256:cli-evidence-001".to_string(),
        @0xB,
        sui::test_scenario::ctx(&mut ctx)
    );

    sui::test_scenario::next_tx(&mut ctx, @0xB);
    let shipment = sui::test_scenario::take_from_sender<shipment::Shipment>(&ctx);
    assert!(shipment::get_status(&shipment) == b"CREATED".to_string());
    assert!(shipment::get_walrus_blob_id(&shipment) == b"walrus-blob-cli-001".to_string());
    assert!(shipment::get_evidence_hash(&shipment) == b"sha256:cli-evidence-001".to_string());

    shipment::destroy_for_testing(shipment);
    sui::test_scenario::end(ctx);
}
