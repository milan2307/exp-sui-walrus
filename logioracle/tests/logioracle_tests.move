#[test_only]
module logioracle::logioracle_tests;

use logioracle::shipment;
use logioracle::bill_of_lading;

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

// ── Bill of Lading tests ─────────────────────────────────────────────────────

/// Shipper (0xA) issues a BL to consignee (0xB).
/// Consignee receives the NFT and can read all fields.
#[test]
fun issues_bl_to_consignee() {
    let mut ctx = sui::test_scenario::begin(@0xA);

    bill_of_lading::issue(
        b"MSCU-2026-001".to_string(),
        b"MSC AURORA".to_string(),
        b"AW216N".to_string(),
        b"Mombasa".to_string(),
        b"Felixstowe".to_string(),
        @0xB,
        b"Standard Chartered Bank London".to_string(),
        b"500 x 50kg bags of green coffee".to_string(),
        2u64,
        b"walrus-blob-bl-001".to_string(),
        b"sha256:bl-evidence-001".to_string(),
        sui::test_scenario::ctx(&mut ctx)
    );

    sui::test_scenario::next_tx(&mut ctx, @0xB);
    let bl = sui::test_scenario::take_from_sender<bill_of_lading::BillOfLading>(&ctx);

    assert!(bill_of_lading::get_bl_number(&bl) == b"MSCU-2026-001".to_string());
    assert!(bill_of_lading::get_vessel(&bl) == b"MSC AURORA".to_string());
    assert!(bill_of_lading::get_shipper(&bl) == @0xA);
    assert!(bill_of_lading::get_status(&bl) == bill_of_lading::status_issued());
    assert!(bill_of_lading::get_container_count(&bl) == 2u64);

    bill_of_lading::destroy_for_testing(bl);
    sui::test_scenario::end(ctx);
}

/// Full BL lifecycle: issue → endorse to bank → endorse back → surrender.
/// Mirrors real trade finance:
///   1. Shipper issues BL to consignee
///   2. Consignee endorses to bank for Letter of Credit
///   3. Bank endorses back once payment clears
///   4. Consignee surrenders at port — cargo released
#[test]
fun bl_full_lifecycle_issue_endorse_surrender() {
    let mut ctx = sui::test_scenario::begin(@0xA);

    bill_of_lading::issue(
        b"MSCU-2026-002".to_string(),
        b"EVER GIVEN".to_string(),
        b"EG301W".to_string(),
        b"Nairobi ICD".to_string(),
        b"Hamburg".to_string(),
        @0xB,
        b"Hamburg Port Agent".to_string(),
        b"200 x electronics cartons".to_string(),
        1u64,
        b"walrus-blob-bl-002".to_string(),
        b"sha256:bl-evidence-002".to_string(),
        sui::test_scenario::ctx(&mut ctx)
    );

    // Consignee endorses BL to bank for LC settlement
    sui::test_scenario::next_tx(&mut ctx, @0xB);
    let bl = sui::test_scenario::take_from_sender<bill_of_lading::BillOfLading>(&ctx);
    bill_of_lading::endorse(bl, @0xC, sui::test_scenario::ctx(&mut ctx));

    // Bank verifies payment, endorses back to consignee
    sui::test_scenario::next_tx(&mut ctx, @0xC);
    let bl = sui::test_scenario::take_from_sender<bill_of_lading::BillOfLading>(&ctx);
    assert!(bill_of_lading::get_status(&bl) == bill_of_lading::status_endorsed());
    bill_of_lading::endorse(bl, @0xB, sui::test_scenario::ctx(&mut ctx));

    // Consignee surrenders at port — cargo released, object destroyed
    sui::test_scenario::next_tx(&mut ctx, @0xB);
    let bl = sui::test_scenario::take_from_sender<bill_of_lading::BillOfLading>(&ctx);
    bill_of_lading::surrender(bl, sui::test_scenario::ctx(&mut ctx));

    sui::test_scenario::end(ctx);
}

/// Shipper issues BL directly to bank as first holder.
/// Common in LC at sight: bank controls title until paid.
#[test]
fun bl_bank_holds_title_then_releases_to_consignee() {
    let mut ctx = sui::test_scenario::begin(@0xA);

    bill_of_lading::issue(
        b"MSCU-2026-003".to_string(),
        b"MAERSK EINDHOVEN".to_string(),
        b"ME422E".to_string(),
        b"Mombasa".to_string(),
        b"Rotterdam".to_string(),
        @0xC, // bank as first holder
        b"KCB Bank Mombasa".to_string(),
        b"1000 x sisal bales".to_string(),
        4u64,
        b"walrus-blob-bl-003".to_string(),
        b"sha256:bl-evidence-003".to_string(),
        sui::test_scenario::ctx(&mut ctx)
    );

    // Bank releases title to consignee once LC settled
    sui::test_scenario::next_tx(&mut ctx, @0xC);
    let bl = sui::test_scenario::take_from_sender<bill_of_lading::BillOfLading>(&ctx);
    assert!(bill_of_lading::get_shipper(&bl) == @0xA);
    bill_of_lading::endorse(bl, @0xB, sui::test_scenario::ctx(&mut ctx));

    // Consignee surrenders at Rotterdam — cargo released
    sui::test_scenario::next_tx(&mut ctx, @0xB);
    let bl = sui::test_scenario::take_from_sender<bill_of_lading::BillOfLading>(&ctx);
    bill_of_lading::surrender(bl, sui::test_scenario::ctx(&mut ctx));

    sui::test_scenario::end(ctx);
}
