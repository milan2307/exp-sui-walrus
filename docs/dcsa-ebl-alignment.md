# DCSA eBL 3.0 Alignment — logioracle::bill_of_lading

Document: TradeProof alignment with the DCSA Electronic Bill of Lading standard v3.0
Date: 2026-06-17
Reference: dcsa.org/standards/electronic-bill-of-lading

---

## Why This Matters

The Digital Container Shipping Association (DCSA) eBL 3.0 is the industry-standard
data specification for electronic Bills of Lading, backed by the world's largest
shipping lines (Maersk, MSC, CMA CGM, Evergreen, Hapag-Lloyd, ONE, Yang Ming, HMM,
ZIM — representing ~85% of global container capacity).

In May 2025, DCSA completed the first interoperable eBL transaction between two
different platforms (CargoX and EdoxOnline). Any platform that maps to DCSA eBL 3.0
is interoperable with every other DCSA-compliant platform.

**The goal:** position `logioracle::bill_of_lading` as a DCSA-compliant eBL on Sui,
not a custom implementation. This removes the "proprietary standard" objection from
every shipping line conversation.

---

## DCSA eBL 3.0 Field Mapping

### Party Identification

| DCSA eBL 3.0 Field | DCSA Type | logioracle::bill_of_lading | Gap |
|---|---|---|---|
| Shipper | PartyDetails (name, address, city, country) | `shipper: address` | Partial — Sui address maps to party. Full details in Walrus document. |
| Consignee | PartyDetails | Current Sui owner (address) | Covered by object ownership model |
| Notify Party | PartyDetails | `notify_party: String` | Covered — stored as string, full details in Walrus doc |
| Carrier | CarrierDetails (name, SCAC code) | Not in struct | **Gap** — add `carrier_name: String` and `scac_code: String` |
| Issuer | Party issuing the eBL | `shipper` at creation time | Covered |

### Transport Identifiers

| DCSA eBL 3.0 Field | DCSA Type | logioracle::bill_of_lading | Gap |
|---|---|---|---|
| Transport Document Reference | String (BL number) | `bl_number: String` | Covered |
| Carrier Booking Reference | String | Not stored | **Gap** — reference to booking |
| Vessel Name | String | `vessel: String` | Covered |
| Voyage Number | String | `voyage: String` | Covered |
| Service Code | String (trade lane) | Not stored | Minor gap — omit for v1 |
| Universal Service Reference | String (USR) | Not stored | Optional — omit for v1 |

### Geography

| DCSA eBL 3.0 Field | DCSA Type | logioracle::bill_of_lading | Gap |
|---|---|---|---|
| Place of Receipt | UN/LOCODE | Not stored | **Gap** — can differ from port of loading (e.g. Nairobi ICD vs. Mombasa Port) |
| Port of Loading | UN/LOCODE | `port_of_loading: String` | Covered — use UN/LOCODE format (e.g. "KEMBA") |
| Port of Discharge | UN/LOCODE | `port_of_discharge: String` | Covered |
| Place of Delivery | UN/LOCODE | Not stored | **Gap** — final delivery point (e.g. inland depot) |
| Pre-Carriage By | Transport mode | Not stored | Optional — omit for v1 |
| On-Carriage By | Transport mode | Not stored | Optional — omit for v1 |

### Document Attributes

| DCSA eBL 3.0 Field | DCSA Type | logioracle::bill_of_lading | Gap |
|---|---|---|---|
| Transport Document Type Code | STRAIGHT / TO ORDER / BEARER | Not stored | **Gap** — critical for legal classification |
| Shipped on Board Date | Date | Not stored | **Gap** — date cargo loaded on vessel |
| Issue Date | Date | Not stored | **Gap** — when BL was issued |
| Place of Issue | String | Not stored | Gap — minor, omit for v1 |
| Freight Terms | PREPAID / COLLECT | Not stored | **Gap** — who pays freight |
| Clause Details | Array of strings | Not stored | In Walrus document |
| Number of Originals Issued | Integer | Not stored | Irrelevant for digital — always 1 |
| Declared Value | Amount | Not stored | In Walrus document / Commercial Invoice |

### Cargo Details

| DCSA eBL 3.0 Field | DCSA Type | logioracle::bill_of_lading | Gap |
|---|---|---|---|
| Cargo Description | String | `cargo_description: String` | Covered |
| Number of Packages | Integer | Not stored | **Gap** — currently only container count |
| Package Type Code | String (e.g. CTN, BG, PL) | Not stored | In Walrus document |
| Gross Weight (kg) | Decimal | Not stored | **Gap** — `gross_weight_kg` missing |
| Gross Volume (m³) | Decimal | Not stored | In Walrus document |
| HS Code | String | Not stored | **Gap** — critical for customs |

### Container Details (DCSA calls this "Utilized Transport Equipment")

| DCSA eBL 3.0 Field | DCSA Type | logioracle::bill_of_lading | Gap |
|---|---|---|---|
| Container Number | ISO 6346 | Not stored | Covered by `logioracle::container` — cross-reference |
| Container ISO Size/Type | String | Not stored | In container object |
| Seal Number | String | Not stored | In Walrus document |
| Container Count | Integer | `container_count: u64` | Covered |

### Evidence (Walrus-specific extension)

| Field | logioracle extension | Note |
|---|---|---|
| walrus_blob_id | `walrus_blob_id: String` | Not in DCSA standard — our addition |
| evidence_hash | `evidence_hash: String` | Not in DCSA standard — our addition |

These two fields are TradeProof's core contribution beyond the DCSA standard:
cryptographic proof that the document in Walrus matches what was recorded on Sui.
No existing DCSA implementation has this.

---

## Priority Gaps to Close

Ranked by importance for DCSA compliance and shipping line adoption:

### Critical (must add)

**1. `bl_type: u8` — Transport Document Type Code**
```
0 = STRAIGHT (non-negotiable, specific consignee)
1 = TO_ORDER (negotiable, endorsable)
2 = BEARER   (whoever holds it)
```
Currently the contract defaults to STRAIGHT behaviour (named consignee/holder).
Adding this field makes the intent explicit and DCSA-compliant.

**2. `place_of_receipt: String` and `place_of_delivery: String`**
In African trade these routinely differ from port of loading/discharge.
Nairobi ICD → Mombasa Port (place of receipt → port of loading).
Felixstowe → Birmingham depot (port of discharge → place of delivery).

**3. `shipped_on_board_date_ms: u64`**
The legally critical date in trade finance. Not when the BL was issued —
when the cargo was physically loaded on the vessel.

**4. `freight_terms: u8` (0=PREPAID, 1=COLLECT)**
Determines who pays the ocean freight. Banks check this against the LC.

### Important (add in next iteration)

**5. `carrier_scac: String`** — 4-letter carrier code (MSCU, MAEU, CMDU, EGLV)
**6. `gross_weight_kg: u64`** — needed for customs
**7. `hs_code: String`** — commodity classification, needed for duty calculation
**8. `carrier_booking_ref: String`** — links BL to the booking confirmation

### In Walrus document only (not on-chain)

- Package type and count details (change per shipment, not identity)
- Seal numbers
- Clause details (may be hundreds of words)
- Volume measurements
- Dangerous goods declarations

---

## Implementation Plan

### Step 1 — Add critical fields to bill_of_lading.move

```move
public struct BillOfLading has key, store {
    id: sui::object::UID,
    // existing fields...
    bl_type: u8,                    // STRAIGHT=0, TO_ORDER=1, BEARER=2
    place_of_receipt: String,       // e.g. "Nairobi ICD" / UN/LOCODE "KENBO"
    place_of_delivery: String,      // e.g. "Birmingham Freight Terminal"
    shipped_on_board_date_ms: u64,  // legally critical date
    freight_terms: u8,              // PREPAID=0, COLLECT=1
    carrier_scac: String,           // e.g. "MSCU", "MAEU"
    gross_weight_kg: u64,
    hs_code: String,
}
```

### Step 2 — DCSA compliance statement

Once fields are added, publish: "logioracle::bill_of_lading implements the core
DCSA eBL 3.0 data model. The Walrus blob referenced in walrus_blob_id contains
the full DCSA-formatted JSON document. The evidence_hash provides cryptographic
proof of document integrity not available in any existing DCSA implementation."

### Step 3 — Contact DCSA

Email: digital-standards@dcsa.org
Subject: Sui blockchain implementation of DCSA eBL 3.0 — interoperability enquiry

Ask: "We have implemented the DCSA eBL 3.0 data model as a Sui Move smart contract.
The BL is an owned NFT — only the holder can endorse or surrender it, enforced by
the Sui network at the protocol level. We would like to discuss whether this qualifies
for the DCSA interoperability programme alongside CargoX and EdoxOnline."

---

## What Sui Adds Beyond the DCSA Standard

The DCSA standard defines the *data model*. It does not specify *how* holder rights
are enforced — that is left to each implementing platform.

Existing DCSA implementations (CargoX, EdoxOnline, WaveBL) enforce holder rights
through their own platform logic — a database record that says "this user holds the BL."
The platform can override that. You are trusting the platform.

`logioracle::bill_of_lading` enforces holder rights at the protocol level:
- The BL is a Sui object
- Only the current object owner can call `endorse()` or `surrender()`
- The Sui network (not TradeProof) enforces this — we cannot override it
- If TradeProof disappears tomorrow, every existing BL NFT still works on Sui

This is the technical differentiator that no existing DCSA platform has.
It should be the centrepiece of the DCSA conversation.

---

## UN/LOCODE Recommendation

DCSA uses UN/LOCODE for all port/place fields. TradeProof should adopt the same.

Key East Africa codes:
| Location | UN/LOCODE |
|---|---|
| Mombasa Port | KE MBA |
| Nairobi ICD (Embakasi) | KE NBO |
| Kampala | UG KLA |
| Kigali | RW KGL |
| Bujumbura | BI BJM |
| Dar es Salaam | TZ DAR |
| Felixstowe | GB FXT |
| Rotterdam | NL RTM |
| Hamburg | DE HAM |
| Dubai (Jebel Ali) | AE JEA |
