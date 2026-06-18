module logioracle::certificate_of_origin {
    use std::string::String;

    // ── Error codes ───────────────────────────────────────────────────────────
    const ENotAuthority: u64 = 0;
    const ENotExporter: u64 = 1;
    const EAlreadyCertified: u64 = 2;
    const EAlreadyCancelled: u64 = 3;

    // ── Status ────────────────────────────────────────────────────────────────
    const STATUS_DRAFT: u8 = 0;      // exporter created, pending authority
    const STATUS_CERTIFIED: u8 = 1;  // authority countersigned — legally valid
    const STATUS_REJECTED: u8 = 2;   // authority rejected
    const STATUS_CANCELLED: u8 = 3;

    // ── Object ────────────────────────────────────────────────────────────────
    //
    // Certificate of Origin proves where goods were manufactured.
    // Required for preferential tariff rates under FTAs (AfCFTA, COMESA, etc.).
    //
    // Two-step: exporter creates draft → issuing_authority certifies.
    // Shared object so both can write without one owning it.
    //
    // issuing_authority — on-chain address of the Chamber of Commerce /
    //                     government body that countersigns.
    // exporter          — manufacturer / shipper.

    public struct CertificateOfOrigin has key, store {
        id: sui::object::UID,
        co_number: String,
        issuing_authority: address,
        authority_name: String,        // e.g. "Kenya National Chamber of Commerce"
        exporter: address,
        consignee_name: String,
        origin_country: String,
        destination_country: String,
        hs_code: String,               // Harmonized System code for goods
        goods_description: String,
        gross_weight_kg: u64,
        preference_code: String,       // e.g. "COMESA Form C", "EUR1", "GSP Form A"
        bl_number: String,             // reference to associated BL
        invoice_number: String,        // reference to commercial invoice
        walrus_blob_id: String,
        evidence_hash: String,
        status: u8,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct CODraftCreated has copy, drop {
        co_number: String,
        exporter: address,
        issuing_authority: address,
        origin_country: String,
        destination_country: String,
        hs_code: String,
    }

    public struct COCertified has copy, drop {
        co_number: String,
        certified_by: address,
        preference_code: String,
    }

    public struct CORejected has copy, drop {
        co_number: String,
        rejected_by: address,
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    /// Exporter creates a CO draft and shares it.
    /// The named issuing_authority must then call certify().
    public fun create_and_share(
        co_number: String,
        issuing_authority: address,
        authority_name: String,
        consignee_name: String,
        origin_country: String,
        destination_country: String,
        hs_code: String,
        goods_description: String,
        gross_weight_kg: u64,
        preference_code: String,
        bl_number: String,
        invoice_number: String,
        walrus_blob_id: String,
        evidence_hash: String,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let exporter = sui::tx_context::sender(ctx);
        let co = CertificateOfOrigin {
            id: sui::object::new(ctx),
            co_number,
            issuing_authority,
            authority_name,
            exporter,
            consignee_name,
            origin_country,
            destination_country,
            hs_code,
            goods_description,
            gross_weight_kg,
            preference_code,
            bl_number,
            invoice_number,
            walrus_blob_id,
            evidence_hash,
            status: STATUS_DRAFT,
        };

        sui::event::emit(CODraftCreated {
            co_number: co.co_number,
            exporter,
            issuing_authority: co.issuing_authority,
            origin_country: co.origin_country,
            destination_country: co.destination_country,
            hs_code: co.hs_code,
        });

        sui::transfer::share_object(co);
    }

    // ── Authority actions ─────────────────────────────────────────────────────

    /// Issuing authority countersigns the CO — it is now legally valid.
    public fun certify(
        co: &mut CertificateOfOrigin,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == co.issuing_authority, ENotAuthority);
        assert!(co.status == STATUS_DRAFT, EAlreadyCertified);

        co.status = STATUS_CERTIFIED;
        sui::event::emit(COCertified {
            co_number: co.co_number,
            certified_by: sui::tx_context::sender(ctx),
            preference_code: co.preference_code,
        });
    }

    /// Authority rejects the CO (wrong HS code, incorrect origin claim, etc.).
    public fun reject(
        co: &mut CertificateOfOrigin,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == co.issuing_authority, ENotAuthority);
        assert!(co.status == STATUS_DRAFT, EAlreadyCertified);

        co.status = STATUS_REJECTED;
        sui::event::emit(CORejected {
            co_number: co.co_number,
            rejected_by: sui::tx_context::sender(ctx),
        });
    }

    /// Exporter cancels before certification.
    public fun cancel(
        co: &mut CertificateOfOrigin,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == co.exporter, ENotExporter);
        assert!(co.status == STATUS_DRAFT, EAlreadyCancelled);
        co.status = STATUS_CANCELLED;
    }

    // ── Getters ───────────────────────────────────────────────────────────────

    public fun get_co_number(co: &CertificateOfOrigin): String         { co.co_number }
    public fun get_status(co: &CertificateOfOrigin): u8                { co.status }
    public fun get_exporter(co: &CertificateOfOrigin): address         { co.exporter }
    public fun get_issuing_authority(co: &CertificateOfOrigin): address { co.issuing_authority }
    public fun get_hs_code(co: &CertificateOfOrigin): String           { co.hs_code }
    public fun get_origin_country(co: &CertificateOfOrigin): String    { co.origin_country }
    public fun get_preference_code(co: &CertificateOfOrigin): String   { co.preference_code }

    public fun status_draft(): u8     { STATUS_DRAFT }
    public fun status_certified(): u8 { STATUS_CERTIFIED }
    public fun status_rejected(): u8  { STATUS_REJECTED }

    // ── Test helpers ──────────────────────────────────────────────────────────

    #[test_only]
    public fun create_for_testing(
        co_number: String,
        issuing_authority: address,
        authority_name: String,
        origin_country: String,
        destination_country: String,
        hs_code: String,
        goods_description: String,
        preference_code: String,
        walrus_blob_id: String,
        evidence_hash: String,
        ctx: &mut sui::tx_context::TxContext
    ): CertificateOfOrigin {
        let exporter = sui::tx_context::sender(ctx);
        CertificateOfOrigin {
            id: sui::object::new(ctx),
            co_number,
            issuing_authority,
            authority_name,
            exporter,
            consignee_name: b"test-consignee".to_string(),
            origin_country,
            destination_country,
            hs_code,
            goods_description,
            gross_weight_kg: 1000,
            preference_code,
            bl_number: b"BL-TEST-001".to_string(),
            invoice_number: b"INV-TEST-001".to_string(),
            walrus_blob_id,
            evidence_hash,
            status: STATUS_DRAFT,
        }
    }

    #[test_only]
    public fun destroy_for_testing(co: CertificateOfOrigin) {
        let CertificateOfOrigin {
            id, co_number: _, issuing_authority: _, authority_name: _, exporter: _,
            consignee_name: _, origin_country: _, destination_country: _, hs_code: _,
            goods_description: _, gross_weight_kg: _, preference_code: _, bl_number: _,
            invoice_number: _, walrus_blob_id: _, evidence_hash: _, status: _,
        } = co;
        sui::object::delete(id);
    }
}
