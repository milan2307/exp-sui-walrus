# LAST PLAN

Generated at: 2026-06-16

## Current Objective
Complete the safest next product increment: a Localnet event readback proof for TradeProof lifecycle events.

## Already Completed
- Installed the official prebuilt Sui Windows CLI locally under MilanGPT OS `.tools/sui`.
- Verified Sui CLI version.
- Confirmed `logioracle` builds.
- Added `walrus_blob_id` to the `Shipment` object.
- Added a real Sui Move unit test for create/update proof behavior.
- Verified `sui move test` passes with 1 test.
- Added `proof_type` and `evidence_hash` metadata.
- Added a repo-level `npm test` harness that runs the real Sui Move test.

## Next Practical Change
Option A from `NOTES_FOR_NEXT_SESSION.md` is implemented and verified:
- `scripts/verify-shipment-events.js` reads Localnet transaction blocks and verifies `ShipmentCreated` and `ShipmentStatusUpdated`.
- `npm run verify:events` verifies lifecycle event proof.
- `npm run demo:local` now runs event verification after object verification.
- `artifacts/tradeproof/events-proof.json` is written as a local ignored proof artifact when the Localnet query succeeds.

Next build choice:
- Option B: add official Walrus upload/retrieve/verify commands.
- Option C: fix the Windows Sui CLI `NativeCertsNotFound` testnet blocker.
- Option D: build a simple UI dashboard.

## Verification Command
From `C:\Users\milan\Documents\exp-sui-walrus\logioracle`:

```powershell
C:\Users\milan\Documents\MilanGPT-OS\.tools\sui\sui.exe move test
```

Repo-level:

```powershell
npm test
npm run demo:evidence
npm run demo:memwal
npm run local:sui
npm run publish:logioracle -- --env local --execute
npm run tx:shipment -- --package <published-package-id> --dry-run
npm run tx:status -- --package <published-package-id> --object <shipment-object-id> --status DELIVERED --env local --execute
npm run verify:shipment -- --object <shipment-object-id> --env local
npm run demo:local
```
