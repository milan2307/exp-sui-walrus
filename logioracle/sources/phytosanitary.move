module logioracle::phytosanitary {
    use std::string::String;

    // ── Error codes ───────────────────────────────────────────────────────────
    const ENotAuthority: u64 = 0;
    const EAlreadyCertified: u64 = 1;
    const ECertificateExpired: u64 = 2;

    // ── Status ────────────────────────────────────────────────────────────────
    const STATUS_DRAFT: u8 = 0;       // exporter submitted application
    const STATUS_CERTIFIED: u8 = 1;   // government authority signed — valid
    const STATUS_REJECTED: u8 = 2;    // authority rejected (pest found, etc.)
    const STATUS_EXPIRED: u8 = 3;
    const STATUS_USED: u8 = 4;        // presented at destination, consumed

    // ── Object ────────────────────────────────────────────────────────────────
    //
    // Phytosanitary Certificate: issued by a national plant protection
    // organisation (NPPO) certifying that goods are free from pests/diseases.
    // Required by destination country before agricultural goods can enter.
    //
    // Examples: KEPHIS (Kenya), USDA APHIS (USA), DEFRA (UK).
    //
    // Also covers Health Certificates (for meat, fish, dairy) — same structure.
    //
    // cert_type: "PHYTOSANITARY" | "HEALTH" | "VETERINARY" | "FUMIGATION"
    //
    // issuing_authority must countersign — shared object pattern.

    public struct PhytosanitaryCertificate has key, store {
        id: sui::object::UID,
        certificate_number: String,
        cert_type: String,
        issuing_authority: address,
        authority_name: String,        // e.g. "KEPHIS" / "DEFRA"
        exporter: address,
        exporter_name: String,
        origin_country: String,
        destination_country: String,
        goods_description: String,
        quantity_kg: u64,
        hs_code: String,
        treatment_type: String,        // e.g. "Methyl Bromide", "Heat Treatment", "None"
        treatment_date_ms: u64,
        issue_date_ms: u64,
        expiry_date_ms: u64,           // typically 14–30 days from issue
        bl_number: String,
        additional_declarations: String, // authority's specific declarations
        walrus_blob_id: String,
        evidence_hash: String,
        status: u8,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct PhytoCertSubmitted has copy, drop {
        certificate_number: String,
        cert_type: String,
        exporter: address,
        issuing_authority: address,
        origin_country: String,
        destination_country: String,
    }

    public struct PhytoCertCertified has copy, drop {
        certificate_number: String,
        certified_by: address,
        expiry_date_ms: u64,
    }

    public struct PhytoCertRejected has copy, drop {
        certificate_number: String,
        rejected_by: address,
    }

    public struct PhytoCertUsed has copy, drop {
        certificate_number: String,
        presented_at: String,
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    /// Exporter submits application — shared so authority can countersign.
    public fun submit_and_share(
        certificate_number: String,
        cert_type: String,
        issuing_authority: address,
        authority_name: String,
        exporter_name: String,
        origin_country: String,
        destination_country: String,
        goods_description: String,
        quantity_kg: u64,
        hs_code: String,
        treatment_type: String,
        treatment_date_ms: u64,
        expiry_date_ms: u64,
        bl_number: String,
        additional_declarations: String,
        walrus_blob_id: String,
        evidence_hash: String,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let exporter = sui::tx_context::sender(ctx);
        let cert = PhytosanitaryCertificate {
            id: sui::object::new(ctx),
            certificate_number,
            cert_type,
            issuing_authority,
            authority_name,
            exporter,
            exporter_name,
            origin_country,
            destination_country,
            goods_description,
            quantity_kg,
            hs_code,
            treatment_type,
            treatment_date_ms,
            issue_date_ms: 0,         // set on certification
            expiry_date_ms,
            bl_number,
            additional_declarations,
            walrus_blob_id,
            evidence_hash,
            status: STATUS_DRAFT,
        };

        sui::event::emit(PhytoCertSubmitted {
            certificate_number: cert.certificate_number,
            cert_type: cert.cert_type,
            exporter,
            issuing_authority: cert.issuing_authority,
            origin_country: cert.origin_country,
            destination_country: cert.destination_country,
        });

        sui::transfer::share_object(cert);
    }

    // ── Authority actions ─────────────────────────────────────────────────────

    /// NPPO inspector certifies after physical inspection.
    public fun certify(
        cert: &mut PhytosanitaryCertificate,
        issue_date_ms: u64,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == cert.issuing_authority, ENotAuthority);
        assert!(cert.status == STATUS_DRAFT, EAlreadyCertified);

        cert.status = STATUS_CERTIFIED;
        cert.issue_date_ms = issue_date_ms;

        sui::event::emit(PhytoCertCertified {
            certificate_number: cert.certificate_number,
            certified_by: sui::tx_context::sender(ctx),
            expiry_date_ms: cert.expiry_date_ms,
        });
    }

    /// Inspector rejects (pest found, treatment failure, incorrect docs).
    public fun reject(
        cert: &mut PhytosanitaryCertificate,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == cert.issuing_authority, ENotAuthority);
        assert!(cert.status == STATUS_DRAFT, EAlreadyCertified);

        cert.status = STATUS_REJECTED;
        sui::event::emit(PhytoCertRejected {
            certificate_number: cert.certificate_number,
            rejected_by: sui::tx_context::sender(ctx),
        });
    }

    /// Mark expired — callable by anyone after expiry_date_ms.
    public fun expire(
        cert: &mut PhytosanitaryCertificate,
        current_ms: u64,
        _ctx: &sui::tx_context::TxContext
    ) {
        assert!(cert.status == STATUS_CERTIFIED, EAlreadyCertified);
        assert!(current_ms > cert.expiry_date_ms, ECertificateExpired);
        cert.status = STATUS_EXPIRED;
    }

    /// Destination authority marks certificate as used/presented.
    public fun mark_used(
        cert: &mut PhytosanitaryCertificate,
        presented_at: String,
        current_ms: u64,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(cert.status == STATUS_CERTIFIED, EAlreadyCertified);
        assert!(current_ms <= cert.expiry_date_ms, ECertificateExpired);
        let _ = ctx;
        cert.status = STATUS_USED;
        sui::event::emit(PhytoCertUsed {
            certificate_number: cert.certificate_number,
            presented_at,
        });
    }

    // ── Getters ───────────────────────────────────────────────────────────────

    public fun get_certificate_number(c: &PhytosanitaryCertificate): String  { c.certificate_number }
    public fun get_cert_type(c: &PhytosanitaryCertificate): String           { c.cert_type }
    public fun get_status(c: &PhytosanitaryCertificate): u8                  { c.status }
    public fun get_exporter(c: &PhytosanitaryCertificate): address           { c.exporter }
    public fun get_issuing_authority(c: &PhytosanitaryCertificate): address  { c.issuing_authority }
    public fun get_origin_country(c: &PhytosanitaryCertificate): String      { c.origin_country }
    public fun get_destination_country(c: &PhytosanitaryCertificate): String { c.destination_country }
    public fun get_expiry_date_ms(c: &PhytosanitaryCertificate): u64         { c.expiry_date_ms }

    public fun status_draft(): u8     { STATUS_DRAFT }
    public fun status_certified(): u8 { STATUS_CERTIFIED }
    public fun status_rejected(): u8  { STATUS_REJECTED }
    public fun status_expired(): u8   { STATUS_EXPIRED }
    public fun status_used(): u8      { STATUS_USED }

    // ── Test helpers ──────────────────────────────────────────────────────────

    #[test_only]
    public fun create_for_testing(
        certificate_number: String,
        issuing_authority: address,
        origin_country: String,
        destination_country: String,
        expiry_date_ms: u64,
        ctx: &mut sui::tx_context::TxContext
    ): PhytosanitaryCertificate {
        let exporter = sui::tx_context::sender(ctx);
        PhytosanitaryCertificate {
            id: sui::object::new(ctx),
            certificate_number,
            cert_type: b"PHYTOSANITARY".to_string(),
            issuing_authority,
            authority_name: b"KEPHIS".to_string(),
            exporter,
            exporter_name: b"Test Exporter Ltd".to_string(),
            origin_country,
            destination_country,
            goods_description: b"Green coffee beans".to_string(),
            quantity_kg: 21000,
            hs_code: b"0901.11".to_string(),
            treatment_type: b"None".to_string(),
            treatment_date_ms: 0,
            issue_date_ms: 0,
            expiry_date_ms,
            bl_number: b"BL-TEST-001".to_string(),
            additional_declarations: b"Free from pests and disease".to_string(),
            walrus_blob_id: b"walrus-test".to_string(),
            evidence_hash: b"sha256:test".to_string(),
            status: STATUS_DRAFT,
        }
    }

    #[test_only]
    public fun destroy_for_testing(c: PhytosanitaryCertificate) {
        let PhytosanitaryCertificate {
            id, certificate_number: _, cert_type: _, issuing_authority: _, authority_name: _,
            exporter: _, exporter_name: _, origin_country: _, destination_country: _,
            goods_description: _, quantity_kg: _, hs_code: _, treatment_type: _,
            treatment_date_ms: _, issue_date_ms: _, expiry_date_ms: _, bl_number: _,
            additional_declarations: _, walrus_blob_id: _, evidence_hash: _, status: _,
        } = c;
        sui::object::delete(id);
    }
}
