# Next Session Prompts — TradeProof on Sui + Walrus

Last updated: 2026-06-17

---

## Context to read first (in order)

1. `LESSONS_FROM_FAILED_PROJECTS.md` — strategic research on why TradeLens, we.trade, Contour, Marco Polo all failed. Read this before building anything.
2. `TRADEPROOF_SCOPE.md` — expanded project vision: BL NFT, container Digital IDs, on-chain payments
3. `STATUS.md` — deployed package IDs, live testnet objects, test results
4. `logioracle/sources/` — 9 Move modules (see module list below)

---

## Current codebase state

**9 Move modules, 26 tests passing (all green)**

| Module | What it models |
|---|---|
| `shipment` | Two-party delivery proof — LIVE ON TESTNET |
| `bill_of_lading` | Ocean title document NFT |
| `container` | ISO 6346 Digital ID + demurrage calculator |
| `certificate_of_origin` | FTA origin proof with government countersign |
| `commercial_invoice` | Price/quantity document |
| `freight_rate` | Carrier–shipper rate contract |
| `air_waybill` | MAWB/HAWB, non-negotiable |
| `cmr_note` | Road freight (CMR Convention), 3-party |
| `phytosanitary` | Government health/pest cert |

**Live on Sui Testnet:**
- Package (v2): `0x0c18d6a33f794d9e265029a6f1d9ddbf42a44fbc3239737486a4aaaef2c70f1e`
- Live two-party shared object: `0xc60b8192f9ccd6c5cbb59272d09062b361e14812f3cf9ba4f9b38093778d7c0d`
- Explorer: https://testnet.suivision.xyz/object/0xc60b8192f9ccd6c5cbb59272d09062b361e14812f3cf9ba4f9b38093778d7c0d
- GitHub: https://github.com/milan2307/exp-sui-walrus (public, branch: codex/tradeproof-v0.1-local-demo)

---

## Strategic direction (agreed, do not override)

**We are a protocol, not a platform.** This is the single most important lesson from the four failed projects. Open source contracts, anyone deploys their own instance, no "join our network."

**The ONE problem to solve first: demurrage disputes.**
- $20–30B/year in disputed charges industry-wide
- Two parties only: shipping line + shipper
- No government, no regulator needed
- `container::calculate_demurrage()` already built
- EAC corridor (Mombasa → Nairobi → Kampala) is the pilot market

**Do not add more Move modules until the following real-world actions are done:**
1. Response from Walrus/Sui Discord team (message sent 2026-06-17)
2. Contact DCSA about eBL 3.0 alignment (digital-standards@dcsa.org)
3. Find one freight forwarder in Mombasa for a demurrage pilot

---

## Pending real-world actions (not code tasks)

- [ ] Wait for and action Walrus/Sui Discord response
- [ ] Contact DCSA: ask if Sui implementation qualifies for eBL 3.0 interoperability programme
- [ ] Map `bill_of_lading` module fields to DCSA eBL 3.0 specification (190+ attributes)
- [ ] Find one freight forwarder in Mombasa for real demurrage pilot
- [ ] Write 1-page brief for Sui/Walrus team: demurrage problem → EAC corridor → what we need from them
- [ ] Investigate XDC Network / Contour acquisition (October 2025) — potential partner for LC layer
- [ ] Enable GitHub Pages in repo settings (Settings → Pages → Source: GitHub Actions)

---

## Next CODE tasks (only after real-world actions above are started)

### Priority 1: DCSA eBL 3.0 alignment
Map `logioracle::bill_of_lading` fields to the DCSA eBL 3.0 standard.
This makes the BL NFT a recognised standard, not a custom implementation.
Reference: dcsa.org/standards/electronic-bill-of-lading

### Priority 2: Demurrage pilot flow
Build a simple end-to-end demo of the demurrage dispute resolution:
- Shipping line creates Container object on Sui
- Records GateIn timestamp
- After free days, runs `calculate_demurrage()`
- Both parties can verify the same number from the same on-chain timestamps
- No dispute possible

### Priority 3: Walrus CLI config
Get `client_config.yaml` for testnet Walrus CLI.
Currently using HTTP API workaround. Ask Walrus Discord team for the config.

### Priority 4: Redeploy to testnet
Deploy the full 9-module package to testnet.
Currently only `shipment` module is deployed (v2 package).
The other 8 modules exist in code but are not yet deployed.

### Priority 5: 1-page verifier
Update `web/verify/index.html` to handle all object types
(not just Shipment — also BillOfLading, Container, etc.)

---

## Start prompt for next session

Paste this at the start of the next session:

```
Open the TradeProof project at C:\Users\milan\Documents\exp-sui-walrus.
Read NEXT_SESSION.md, LESSONS_FROM_FAILED_PROJECTS.md, and STATUS.md before doing anything.

Key strategic rule: we are a protocol, not a platform. Do not build anything that requires parties to join a network. Build open standards.

First priority is demurrage pilot flow and DCSA eBL 3.0 alignment.
Run npm test to confirm 26/26 passing before touching any code.
Check for a Discord response from the Walrus/Sui team.
Then ask me what's been done on the real-world actions before proceeding with code.
```

---

## Lessons summary (from research, 2026-06-17)

- TradeLens: competitor governance killed it (Maersk controlled a platform their rivals had to share data on)
- we.trade: no lead investor, 12 equal shareholders, no one accountable
- Contour: 60–70 tx/month at shutdown despite 90% LC time reduction — network effects never fired
- Marco Polo: missed two production deadlines, lost BofA €12m because TradeLens collapsed first
- Survivor (Komgo): specific niche, neutral governance, pragmatic on blockchain, 10,000+ users
- DCSA eBL 3.0 (May 2025): first interoperable eBL between two platforms — protocol won
- XDC acquired Contour (Oct 2025): LC use case has value, platform model failed
- Walrus raised $140m for RWA — aligned with TradeProof
- No known trade finance project on Sui yet — open lane
