module logioracle::commercial_invoice {
    use std::string::String;

    // ── Error codes ───────────────────────────────────────────────────────────
    const ENotSeller: u64 = 0;
    const ENotBuyer: u64 = 1;
    const EAlreadySettled: u64 = 2;

    // ── Status ────────────────────────────────────────────────────────────────
    const STATUS_ISSUED: u8 = 0;
    const STATUS_ACCEPTED: u8 = 1;   // buyer accepts — triggers payment obligation
    const STATUS_PAID: u8 = 2;
    const STATUS_DISPUTED: u8 = 3;

    // ── Object ────────────────────────────────────────────────────────────────
    //
    // Commercial invoice: the price and quantity document that accompanies
    // every international shipment. Customs uses it to assess duty.
    // Banks use it to match against the LC and BL.
    //
    // Shared so both seller and buyer can update status independently.
    // unit_price_cents and total_value_cents: avoid floating point.

    public struct CommercialInvoice has key, store {
        id: sui::object::UID,
        invoice_number: String,
        seller: address,
        buyer: address,
        bl_number: String,          // cross-reference to BL
        co_number: String,          // cross-reference to Certificate of Origin
        goods_description: String,
        quantity: u64,
        unit: String,               // MT, kg, pieces, cartons
        unit_price_cents: u64,      // price per unit in USD cents
        total_value_cents: u64,     // quantity * unit_price_cents
        currency: String,           // USD, EUR, KES, etc.
        incoterms: String,          // FOB, CIF, EXW, DAP, DDP
        origin_country: String,
        walrus_blob_id: String,
        evidence_hash: String,
        status: u8,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct InvoiceIssued has copy, drop {
        invoice_number: String,
        seller: address,
        buyer: address,
        total_value_cents: u64,
        currency: String,
        incoterms: String,
        bl_number: String,
    }

    public struct InvoiceAccepted has copy, drop {
        invoice_number: String,
        buyer: address,
        total_value_cents: u64,
    }

    public struct InvoicePaid has copy, drop {
        invoice_number: String,
        paid_by: address,
        total_value_cents: u64,
    }

    public struct InvoiceDisputed has copy, drop {
        invoice_number: String,
        disputed_by: address,
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    public fun issue_and_share(
        invoice_number: String,
        buyer: address,
        bl_number: String,
        co_number: String,
        goods_description: String,
        quantity: u64,
        unit: String,
        unit_price_cents: u64,
        currency: String,
        incoterms: String,
        origin_country: String,
        walrus_blob_id: String,
        evidence_hash: String,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let seller = sui::tx_context::sender(ctx);
        let total_value_cents = quantity * unit_price_cents;
        let inv = CommercialInvoice {
            id: sui::object::new(ctx),
            invoice_number,
            seller,
            buyer,
            bl_number,
            co_number,
            goods_description,
            quantity,
            unit,
            unit_price_cents,
            total_value_cents,
            currency,
            incoterms,
            origin_country,
            walrus_blob_id,
            evidence_hash,
            status: STATUS_ISSUED,
        };

        sui::event::emit(InvoiceIssued {
            invoice_number: inv.invoice_number,
            seller,
            buyer: inv.buyer,
            total_value_cents: inv.total_value_cents,
            currency: inv.currency,
            incoterms: inv.incoterms,
            bl_number: inv.bl_number,
        });

        sui::transfer::share_object(inv);
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /// Buyer accepts the invoice — creates payment obligation.
    public fun accept(
        inv: &mut CommercialInvoice,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == inv.buyer, ENotBuyer);
        assert!(inv.status == STATUS_ISSUED, EAlreadySettled);
        inv.status = STATUS_ACCEPTED;
        sui::event::emit(InvoiceAccepted {
            invoice_number: inv.invoice_number,
            buyer: inv.buyer,
            total_value_cents: inv.total_value_cents,
        });
    }

    /// Mark as paid. Either party can record payment (seller receives, buyer confirms).
    public fun mark_paid(
        inv: &mut CommercialInvoice,
        ctx: &sui::tx_context::TxContext
    ) {
        let caller = sui::tx_context::sender(ctx);
        assert!(caller == inv.seller || caller == inv.buyer, ENotSeller);
        assert!(inv.status == STATUS_ACCEPTED || inv.status == STATUS_ISSUED, EAlreadySettled);
        inv.status = STATUS_PAID;
        sui::event::emit(InvoicePaid {
            invoice_number: inv.invoice_number,
            paid_by: caller,
            total_value_cents: inv.total_value_cents,
        });
    }

    /// Buyer disputes the invoice (wrong quantity, price, or goods).
    public fun dispute(
        inv: &mut CommercialInvoice,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == inv.buyer, ENotBuyer);
        assert!(inv.status == STATUS_ISSUED || inv.status == STATUS_ACCEPTED, EAlreadySettled);
        inv.status = STATUS_DISPUTED;
        sui::event::emit(InvoiceDisputed {
            invoice_number: inv.invoice_number,
            disputed_by: inv.buyer,
        });
    }

    // ── Getters ───────────────────────────────────────────────────────────────

    public fun get_invoice_number(inv: &CommercialInvoice): String  { inv.invoice_number }
    public fun get_status(inv: &CommercialInvoice): u8              { inv.status }
    public fun get_seller(inv: &CommercialInvoice): address         { inv.seller }
    public fun get_buyer(inv: &CommercialInvoice): address          { inv.buyer }
    public fun get_total_value_cents(inv: &CommercialInvoice): u64  { inv.total_value_cents }
    public fun get_incoterms(inv: &CommercialInvoice): String       { inv.incoterms }
    public fun get_bl_number(inv: &CommercialInvoice): String       { inv.bl_number }

    public fun status_issued(): u8   { STATUS_ISSUED }
    public fun status_accepted(): u8 { STATUS_ACCEPTED }
    public fun status_paid(): u8     { STATUS_PAID }
    public fun status_disputed(): u8 { STATUS_DISPUTED }

    // ── Test helpers ──────────────────────────────────────────────────────────

    #[test_only]
    public fun create_for_testing(
        invoice_number: String,
        buyer: address,
        quantity: u64,
        unit_price_cents: u64,
        ctx: &mut sui::tx_context::TxContext
    ): CommercialInvoice {
        let seller = sui::tx_context::sender(ctx);
        CommercialInvoice {
            id: sui::object::new(ctx),
            invoice_number,
            seller,
            buyer,
            bl_number: b"BL-TEST".to_string(),
            co_number: b"CO-TEST".to_string(),
            goods_description: b"test goods".to_string(),
            quantity,
            unit: b"MT".to_string(),
            unit_price_cents,
            total_value_cents: quantity * unit_price_cents,
            currency: b"USD".to_string(),
            incoterms: b"FOB".to_string(),
            origin_country: b"Kenya".to_string(),
            walrus_blob_id: b"walrus-test".to_string(),
            evidence_hash: b"sha256:test".to_string(),
            status: STATUS_ISSUED,
        }
    }

    #[test_only]
    public fun destroy_for_testing(inv: CommercialInvoice) {
        let CommercialInvoice {
            id, invoice_number: _, seller: _, buyer: _, bl_number: _, co_number: _,
            goods_description: _, quantity: _, unit: _, unit_price_cents: _,
            total_value_cents: _, currency: _, incoterms: _, origin_country: _,
            walrus_blob_id: _, evidence_hash: _, status: _,
        } = inv;
        sui::object::delete(id);
    }
}
