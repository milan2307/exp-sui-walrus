#[test_only]
module logioracle::logioracle_tests;

use logioracle::shipment;
use logioracle::bill_of_lading;
use logioracle::container;
use logioracle::certificate_of_origin;
use logioracle::commercial_invoice;
use logioracle::freight_rate;
use logioracle::air_waybill;
use logioracle::cmr_note;
use logioracle::phytosanitary;

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

// ── Container Digital ID tests ────────────────────────────────────────────────

/// Register a container and verify initial state.
#[test]
fun registers_container_with_correct_fields() {
    let mut ctx = sui::test_scenario::begin(@0xA);
    let mut clock = sui::clock::create_for_testing(sui::test_scenario::ctx(&mut ctx));
    sui::clock::set_for_testing(&mut clock, 1_000_000);

    let c = container::register(
        b"MSCU1234567".to_string(),
        b"40HC".to_string(),
        b"MSC".to_string(),
        b"Mombasa".to_string(),
        2018u64,
        &clock,
        sui::test_scenario::ctx(&mut ctx)
    );

    assert!(container::get_iso_id(&c) == b"MSCU1234567".to_string());
    assert!(container::get_size_type(&c) == b"40HC".to_string());
    assert!(container::get_status(&c) == container::status_empty());

    container::destroy_for_testing(c);
    sui::clock::destroy_for_testing(clock);
    sui::test_scenario::end(ctx);
}

/// Full port cycle: empty → stuffed → gate_in → on_vessel → discharged
///                → customs_cleared → gate_out → returned.
#[test]
fun container_full_port_cycle() {
    let mut ctx = sui::test_scenario::begin(@0xA);
    let mut clock = sui::clock::create_for_testing(sui::test_scenario::ctx(&mut ctx));
    sui::clock::set_for_testing(&mut clock, 0);

    let mut c = container::register(
        b"MSCU7654321".to_string(), b"20GP".to_string(),
        b"MSC".to_string(), b"Mombasa".to_string(), 2020u64,
        &clock, sui::test_scenario::ctx(&mut ctx)
    );

    container::stuff(&mut c, b"BL-TEST-001".to_string(), b"Mombasa CFS".to_string(), &clock, sui::test_scenario::ctx(&mut ctx));
    assert!(container::get_status(&c) == container::status_stuffed());

    container::gate_in(&mut c, b"Mombasa Port".to_string(), &clock, sui::test_scenario::ctx(&mut ctx));
    assert!(container::get_status(&c) == container::status_gate_in());

    container::load_on_vessel(&mut c, b"MSC AURORA".to_string(), &clock, sui::test_scenario::ctx(&mut ctx));
    assert!(container::get_status(&c) == container::status_on_vessel());

    container::discharge(&mut c, b"MSC AURORA".to_string(), b"Felixstowe".to_string(), &clock, sui::test_scenario::ctx(&mut ctx));
    assert!(container::get_status(&c) == container::status_discharged());

    container::customs_clear(&mut c, &clock, sui::test_scenario::ctx(&mut ctx));
    assert!(container::get_status(&c) == container::status_customs_cleared());

    container::gate_out(&mut c, @0xB, &clock, sui::test_scenario::ctx(&mut ctx));
    assert!(container::get_status(&c) == container::status_gate_out());

    container::return_empty(&mut c, b"Felixstowe Depot".to_string(), &clock, sui::test_scenario::ctx(&mut ctx));
    assert!(container::get_status(&c) == container::status_returned());

    container::destroy_for_testing(c);
    sui::clock::destroy_for_testing(clock);
    sui::test_scenario::end(ctx);
}

/// Demurrage is zero within the free period.
#[test]
fun no_demurrage_within_free_period() {
    // gate_in at day 0, free_days = 5, current = day 3 → 0 owed
    let day_ms: u64 = 86_400_000;
    let owed = container::calculate_demurrage(0, 5, 50_000, 3 * day_ms);
    assert!(owed == 0);
}

/// Demurrage accrues correctly after free days expire.
#[test]
fun demurrage_accrues_after_free_period() {
    // gate_in at day 0, free_days = 5, rate = $500/day, current = day 8
    // 3 days overdue × $500 = $1500
    let day_ms: u64 = 86_400_000;
    let owed = container::calculate_demurrage(0, 5, 50_000_u64, 8 * day_ms);
    assert!(owed == 3 * 50_000);
}

// ── Certificate of Origin tests ───────────────────────────────────────────────

/// Exporter creates CO draft; authority certifies it.
#[test]
fun authority_certifies_certificate_of_origin() {
    let mut ctx = sui::test_scenario::begin(@0xA); // exporter

    let mut co = certificate_of_origin::create_for_testing(
        b"CO-KE-2026-001".to_string(),
        @0xB, // KNCCI (Kenya National Chamber of Commerce)
        b"Kenya National Chamber of Commerce and Industry".to_string(),
        b"Kenya".to_string(),
        b"United Kingdom".to_string(),
        b"0901.11".to_string(),
        b"Green coffee beans, unwashed arabica".to_string(),
        b"COMESA Form C".to_string(),
        b"walrus-co-001".to_string(),
        b"sha256:co-evidence-001".to_string(),
        sui::test_scenario::ctx(&mut ctx)
    );

    assert!(certificate_of_origin::get_status(&co) == certificate_of_origin::status_draft());
    assert!(certificate_of_origin::get_exporter(&co) == @0xA);

    // Authority (0xB) certifies
    sui::test_scenario::next_tx(&mut ctx, @0xB);
    certificate_of_origin::certify(&mut co, sui::test_scenario::ctx(&mut ctx));

    assert!(certificate_of_origin::get_status(&co) == certificate_of_origin::status_certified());

    certificate_of_origin::destroy_for_testing(co);
    sui::test_scenario::end(ctx);
}

/// A wrong address cannot certify a Certificate of Origin.
#[test, expected_failure(abort_code = 0)]
fun non_authority_cannot_certify_co() {
    let mut ctx = sui::test_scenario::begin(@0xA);

    let mut co = certificate_of_origin::create_for_testing(
        b"CO-KE-2026-002".to_string(),
        @0xB, // named authority
        b"KEPHIS".to_string(),
        b"Kenya".to_string(),
        b"Germany".to_string(),
        b"0603.11".to_string(),
        b"Fresh cut flowers".to_string(),
        b"EAC".to_string(),
        b"walrus-co-002".to_string(),
        b"sha256:co-002".to_string(),
        sui::test_scenario::ctx(&mut ctx)
    );

    // 0xC tries to certify — should abort with ENotAuthority (0)
    sui::test_scenario::next_tx(&mut ctx, @0xC);
    certificate_of_origin::certify(&mut co, sui::test_scenario::ctx(&mut ctx));

    certificate_of_origin::destroy_for_testing(co);
    sui::test_scenario::end(ctx);
}

/// Authority rejects a CO with incorrect origin claim.
#[test]
fun authority_rejects_certificate_of_origin() {
    let mut ctx = sui::test_scenario::begin(@0xA);

    let mut co = certificate_of_origin::create_for_testing(
        b"CO-KE-2026-003".to_string(),
        @0xB,
        b"KenTrade".to_string(),
        b"Kenya".to_string(),
        b"USA".to_string(),
        b"6204.62".to_string(),
        b"Women's trousers".to_string(),
        b"AGOA".to_string(),
        b"walrus-co-003".to_string(),
        b"sha256:co-003".to_string(),
        sui::test_scenario::ctx(&mut ctx)
    );

    sui::test_scenario::next_tx(&mut ctx, @0xB);
    certificate_of_origin::reject(&mut co, sui::test_scenario::ctx(&mut ctx));

    assert!(certificate_of_origin::get_status(&co) == certificate_of_origin::status_rejected());

    certificate_of_origin::destroy_for_testing(co);
    sui::test_scenario::end(ctx);
}

// ── Commercial Invoice tests ──────────────────────────────────────────────────

/// Invoice total is calculated correctly; buyer accepts it.
#[test]
fun invoice_total_calculated_and_buyer_accepts() {
    let mut ctx = sui::test_scenario::begin(@0xA); // seller

    // 500 MT × $1,200/MT = $600,000 = 60,000,000 cents
    let mut inv = commercial_invoice::create_for_testing(
        b"INV-2026-001".to_string(),
        @0xB, // buyer
        500u64,
        120_000u64, // $1,200 per MT in cents
        sui::test_scenario::ctx(&mut ctx)
    );

    assert!(commercial_invoice::get_total_value_cents(&inv) == 500 * 120_000);
    assert!(commercial_invoice::get_status(&inv) == commercial_invoice::status_issued());

    sui::test_scenario::next_tx(&mut ctx, @0xB);
    commercial_invoice::accept(&mut inv, sui::test_scenario::ctx(&mut ctx));

    assert!(commercial_invoice::get_status(&inv) == commercial_invoice::status_accepted());

    commercial_invoice::destroy_for_testing(inv);
    sui::test_scenario::end(ctx);
}

/// Buyer disputes an invoice with incorrect quantity.
#[test]
fun buyer_disputes_invoice() {
    let mut ctx = sui::test_scenario::begin(@0xA);

    let mut inv = commercial_invoice::create_for_testing(
        b"INV-2026-002".to_string(),
        @0xB,
        1000u64,
        50_000u64,
        sui::test_scenario::ctx(&mut ctx)
    );

    sui::test_scenario::next_tx(&mut ctx, @0xB);
    commercial_invoice::dispute(&mut inv, sui::test_scenario::ctx(&mut ctx));
    assert!(commercial_invoice::get_status(&inv) == commercial_invoice::status_disputed());

    commercial_invoice::destroy_for_testing(inv);
    sui::test_scenario::end(ctx);
}

// ── Freight Rate tests ────────────────────────────────────────────────────────

/// Carrier offers rate; shipper accepts within validity window.
#[test]
fun shipper_accepts_freight_rate() {
    let mut ctx = sui::test_scenario::begin(@0xA); // carrier

    let mut rate = freight_rate::create_for_testing(
        b"RATE-MSC-2026-001".to_string(),
        @0xB, // shipper
        b"Mombasa".to_string(),
        b"Rotterdam".to_string(),
        280_000u64, // $2,800 per 40HC in cents
        1_000_000u64, // valid until ms 1,000,000
        sui::test_scenario::ctx(&mut ctx)
    );

    assert!(freight_rate::get_status(&rate) == freight_rate::status_offered());
    assert!(freight_rate::get_rate_cents(&rate) == 280_000);

    sui::test_scenario::next_tx(&mut ctx, @0xB);
    freight_rate::accept(&mut rate, 500_000u64, sui::test_scenario::ctx(&mut ctx)); // current_ms within validity

    assert!(freight_rate::get_status(&rate) == freight_rate::status_accepted());

    freight_rate::destroy_for_testing(rate);
    sui::test_scenario::end(ctx);
}

/// Rate cannot be accepted after expiry.
#[test, expected_failure(abort_code = 3)]
fun expired_rate_cannot_be_accepted() {
    let mut ctx = sui::test_scenario::begin(@0xA);

    let mut rate = freight_rate::create_for_testing(
        b"RATE-EXPIRED-001".to_string(),
        @0xB,
        b"Mombasa".to_string(),
        b"Felixstowe".to_string(),
        250_000u64,
        500_000u64, // valid until ms 500,000
        sui::test_scenario::ctx(&mut ctx)
    );

    sui::test_scenario::next_tx(&mut ctx, @0xB);
    // current_ms 600,000 > valid_until_ms 500,000 — should abort EExpired (3)
    freight_rate::accept(&mut rate, 600_000u64, sui::test_scenario::ctx(&mut ctx));

    freight_rate::destroy_for_testing(rate);
    sui::test_scenario::end(ctx);
}

// ── Air Waybill tests ─────────────────────────────────────────────────────────

/// Airline issues an MAWB and tracks full lifecycle.
#[test]
fun mawb_full_lifecycle() {
    let mut ctx = sui::test_scenario::begin(@0xA); // airline

    let mut awb = air_waybill::issue(
        b"176-12345678".to_string(), // Kenya Airways prefix 176
        air_waybill::type_mawb(),
        b"Kenya Airways".to_string(),
        b"KQ100".to_string(),
        b"NBO".to_string(),
        b"LHR".to_string(),
        @0xB, // shipper
        @0xC, // consignee
        b"Electronic components".to_string(),
        500_000u64,   // 500kg gross
        550_000u64,   // 550kg chargeable (volumetric)
        10_000_000u64, // $100,000 declared value
        b"VAL".to_string(), // valuable cargo
        b"walrus-awb-001".to_string(),
        b"sha256:awb-001".to_string(),
        sui::test_scenario::ctx(&mut ctx)
    );

    assert!(air_waybill::get_awb_type(&awb) == air_waybill::type_mawb());
    assert!(air_waybill::get_status(&awb) == air_waybill::status_issued());
    assert!(air_waybill::get_shipper(&awb) == @0xB);
    assert!(air_waybill::get_consignee(&awb) == @0xC);

    // Carrier progresses the AWB — only carrier updates, not shipper/consignee
    air_waybill::accept_cargo(&mut awb, sui::test_scenario::ctx(&mut ctx));
    assert!(air_waybill::get_status(&awb) == air_waybill::status_accepted());

    air_waybill::depart(&mut awb, sui::test_scenario::ctx(&mut ctx));
    air_waybill::arrive(&mut awb, sui::test_scenario::ctx(&mut ctx));
    air_waybill::clear_customs(&mut awb, sui::test_scenario::ctx(&mut ctx));
    air_waybill::deliver(&mut awb, sui::test_scenario::ctx(&mut ctx));

    assert!(air_waybill::get_status(&awb) == air_waybill::status_delivered());

    air_waybill::destroy_for_testing(awb);
    sui::test_scenario::end(ctx);
}

// ── CMR Note tests ────────────────────────────────────────────────────────────

/// Full CMR lifecycle: issue → carrier accepts → in transit → delivered.
#[test]
fun cmr_full_road_lifecycle() {
    let mut ctx = sui::test_scenario::begin(@0xA); // sender

    let mut cmr = cmr_note::create_for_testing(
        b"CMR-2026-001".to_string(),
        @0xB, // carrier (trucking company)
        @0xC, // recipient
        sui::test_scenario::ctx(&mut ctx)
    );

    assert!(cmr_note::get_status(&cmr) == cmr_note::status_issued());
    assert!(cmr_note::get_sender(&cmr) == @0xA);

    // Carrier accepts custody
    sui::test_scenario::next_tx(&mut ctx, @0xB);
    cmr_note::carrier_accept(&mut cmr, sui::test_scenario::ctx(&mut ctx));
    assert!(cmr_note::get_status(&cmr) == cmr_note::status_carrier_accepted());

    // Carrier marks in transit
    cmr_note::mark_in_transit(&mut cmr, sui::test_scenario::ctx(&mut ctx));
    assert!(cmr_note::get_status(&cmr) == cmr_note::status_in_transit());

    // Recipient confirms delivery
    sui::test_scenario::next_tx(&mut ctx, @0xC);
    cmr_note::confirm_delivery(&mut cmr, sui::test_scenario::ctx(&mut ctx));
    assert!(cmr_note::get_status(&cmr) == cmr_note::status_delivered());

    cmr_note::destroy_for_testing(cmr);
    sui::test_scenario::end(ctx);
}

/// Wrong address cannot confirm CMR delivery.
#[test, expected_failure(abort_code = 2)]
fun wrong_address_cannot_confirm_cmr_delivery() {
    let mut ctx = sui::test_scenario::begin(@0xA);

    let mut cmr = cmr_note::create_for_testing(
        b"CMR-2026-002".to_string(),
        @0xB,
        @0xC, // real recipient
        sui::test_scenario::ctx(&mut ctx)
    );

    sui::test_scenario::next_tx(&mut ctx, @0xB);
    cmr_note::carrier_accept(&mut cmr, sui::test_scenario::ctx(&mut ctx));
    cmr_note::mark_in_transit(&mut cmr, sui::test_scenario::ctx(&mut ctx));

    // 0xD is not the recipient — should abort ENotRecipient (2)
    sui::test_scenario::next_tx(&mut ctx, @0xD);
    cmr_note::confirm_delivery(&mut cmr, sui::test_scenario::ctx(&mut ctx));

    cmr_note::destroy_for_testing(cmr);
    sui::test_scenario::end(ctx);
}

// ── Phytosanitary Certificate tests ──────────────────────────────────────────

/// KEPHIS certifies a phytosanitary certificate for coffee export.
#[test]
fun kephis_certifies_phyto_certificate() {
    let mut ctx = sui::test_scenario::begin(@0xA); // exporter (coffee farmer/trader)

    let mut cert = phytosanitary::create_for_testing(
        b"PC-KE-2026-001".to_string(),
        @0xB, // KEPHIS inspector
        b"Kenya".to_string(),
        b"United Kingdom".to_string(),
        30 * 86_400_000u64, // expires in 30 days
        sui::test_scenario::ctx(&mut ctx)
    );

    assert!(phytosanitary::get_status(&cert) == phytosanitary::status_draft());
    assert!(phytosanitary::get_cert_type(&cert) == b"PHYTOSANITARY".to_string());

    // KEPHIS inspector certifies after physical inspection
    sui::test_scenario::next_tx(&mut ctx, @0xB);
    phytosanitary::certify(&mut cert, 1_000_000u64, sui::test_scenario::ctx(&mut ctx));
    assert!(phytosanitary::get_status(&cert) == phytosanitary::status_certified());

    // Destination authority marks it used on arrival
    phytosanitary::mark_used(
        &mut cert,
        b"Heathrow APHA".to_string(),
        2_000_000u64, // well within 30-day expiry
        sui::test_scenario::ctx(&mut ctx)
    );
    assert!(phytosanitary::get_status(&cert) == phytosanitary::status_used());

    phytosanitary::destroy_for_testing(cert);
    sui::test_scenario::end(ctx);
}

/// Wrong authority address cannot certify a phytosanitary certificate.
#[test, expected_failure(abort_code = 0)]
fun wrong_authority_cannot_certify_phyto() {
    let mut ctx = sui::test_scenario::begin(@0xA);

    let mut cert = phytosanitary::create_for_testing(
        b"PC-KE-2026-002".to_string(),
        @0xB, // named authority
        b"Kenya".to_string(),
        b"Netherlands".to_string(),
        30 * 86_400_000u64,
        sui::test_scenario::ctx(&mut ctx)
    );

    // 0xC is not the named authority — should abort ENotAuthority (0)
    sui::test_scenario::next_tx(&mut ctx, @0xC);
    phytosanitary::certify(&mut cert, 1_000_000u64, sui::test_scenario::ctx(&mut ctx));

    phytosanitary::destroy_for_testing(cert);
    sui::test_scenario::end(ctx);
}
