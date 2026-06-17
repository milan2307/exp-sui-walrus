#[test_only]
module logioracle::logioracle_tests;

use logioracle::shipment;

// ── Existing single-party tests (updated for receiver field) ─────────────────

#[test]
fun creates_and_updates_shipment_proof() {
    let mut ctx = sui::test_scenario::begin(@0xA);
    let mut ship = shipment::create(
        b"SHIP-001".to_string(), b"SHIPMENT".to_string(),
        b"Nairobi".to_string(), b"Mombasa".to_string(),
        b"walrus-blob-test-001".to_string(), b"sha256:test-evidence-001".to_string(),
        @0xA, // receiver = sender (single-party self-proof)
        sui::test_scenario::ctx(&mut ctx)
    );

    assert!(shipment::get_proof_type(&ship) == b"SHIPMENT".to_string());
    assert!(shipment::get_status(&ship) == b"CREATED".to_string());
    assert!(shipment::get_sender(&ship) == @0xA);
    assert!(shipment::get_receiver(&ship) == @0xA);

    shipment::update_status(&mut ship, b"DELIVERED".to_string());
    assert!(shipment::get_status(&ship) == b"DELIVERED".to_string());

    shipment::destroy_for_testing(ship);
    sui::test_scenario::end(ctx);
}

#[test]
fun entry_creates_and_transfers_shipment_proof() {
    let mut ctx = sui::test_scenario::begin(@0xA);

    shipment::create_and_transfer(
        b"SHIP-CLI-001".to_string(), b"SHIPMENT".to_string(),
        b"Nairobi".to_string(), b"Mombasa".to_string(),
        b"walrus-blob-cli-001".to_string(), b"sha256:cli-evidence-001".to_string(),
        @0xB,
        sui::test_scenario::ctx(&mut ctx)
    );

    sui::test_scenario::next_tx(&mut ctx, @0xB);
    let ship = sui::test_scenario::take_from_sender<shipment::Shipment>(&ctx);
    assert!(shipment::get_status(&ship) == b"CREATED".to_string());
    assert!(shipment::get_receiver(&ship) == @0xB);

    shipment::destroy_for_testing(ship);
    sui::test_scenario::end(ctx);
}

#[test, expected_failure(abort_code = 0)]
fun rejects_unknown_status() {
    shipment::assert_valid_status_for_testing(b"CANCELLED".to_string());
}

#[test, expected_failure(abort_code = 1)]
fun rejects_backwards_status_transition() {
    shipment::assert_valid_status_transition_for_testing(
        b"DELIVERED".to_string(), b"IN_TRANSIT".to_string()
    );
}

// ── Two-party confirmation tests ─────────────────────────────────────────────

/// Sender (0xA) creates a shared shipment naming 0xB as receiver.
/// Sender marks IN_TRANSIT, then receiver confirms DELIVERED.
/// Each step is signed by a different address — neither can fake the other.
#[test]
fun two_party_full_lifecycle() {
    let mut ctx = sui::test_scenario::begin(@0xA);

    shipment::create_and_share(
        b"SHIP-2P-001".to_string(), b"SHIPMENT".to_string(),
        b"Nairobi".to_string(), b"London".to_string(),
        b"walrus-blob-2p-001".to_string(), b"sha256:evidence-2p-001".to_string(),
        @0xB, // receiver
        sui::test_scenario::ctx(&mut ctx)
    );

    // Sender marks goods dispatched
    sui::test_scenario::next_tx(&mut ctx, @0xA);
    let mut ship = sui::test_scenario::take_shared<shipment::Shipment>(&ctx);
    assert!(shipment::get_status(&ship) == b"CREATED".to_string());
    shipment::mark_in_transit(&mut ship, sui::test_scenario::ctx(&mut ctx));
    assert!(shipment::get_status(&ship) == b"IN_TRANSIT".to_string());
    sui::test_scenario::return_shared(ship);

    // Receiver confirms delivery — different address, different signature
    sui::test_scenario::next_tx(&mut ctx, @0xB);
    let mut ship = sui::test_scenario::take_shared<shipment::Shipment>(&ctx);
    shipment::confirm_delivery(&mut ship, sui::test_scenario::ctx(&mut ctx));
    assert!(shipment::get_status(&ship) == b"DELIVERED".to_string());
    sui::test_scenario::return_shared(ship);

    sui::test_scenario::end(ctx);
}

/// A third party (0xC) who is neither sender nor receiver cannot confirm delivery.
#[test, expected_failure(abort_code = 3)]
fun rejects_non_receiver_confirm_delivery() {
    let mut ctx = sui::test_scenario::begin(@0xA);

    shipment::create_and_share(
        b"SHIP-2P-002".to_string(), b"SHIPMENT".to_string(),
        b"Cairo".to_string(), b"Hamburg".to_string(),
        b"walrus-blob-2p-002".to_string(), b"sha256:evidence-2p-002".to_string(),
        @0xB,
        sui::test_scenario::ctx(&mut ctx)
    );

    // 0xC tries to confirm — should abort with ENotReceiver (3)
    sui::test_scenario::next_tx(&mut ctx, @0xC);
    let mut ship = sui::test_scenario::take_shared<shipment::Shipment>(&ctx);
    shipment::confirm_delivery(&mut ship, sui::test_scenario::ctx(&mut ctx));
    sui::test_scenario::return_shared(ship);

    sui::test_scenario::end(ctx);
}

/// The sender cannot confirm their own delivery — only the receiver can.
#[test, expected_failure(abort_code = 3)]
fun rejects_sender_self_confirming_delivery() {
    let mut ctx = sui::test_scenario::begin(@0xA);

    shipment::create_and_share(
        b"SHIP-2P-003".to_string(), b"SHIPMENT".to_string(),
        b"Mombasa".to_string(), b"Dubai".to_string(),
        b"walrus-blob-2p-003".to_string(), b"sha256:evidence-2p-003".to_string(),
        @0xB,
        sui::test_scenario::ctx(&mut ctx)
    );

    // Sender tries to confirm their own delivery — should abort with ENotReceiver (3)
    sui::test_scenario::next_tx(&mut ctx, @0xA);
    let mut ship = sui::test_scenario::take_shared<shipment::Shipment>(&ctx);
    shipment::confirm_delivery(&mut ship, sui::test_scenario::ctx(&mut ctx));
    sui::test_scenario::return_shared(ship);

    sui::test_scenario::end(ctx);
}
