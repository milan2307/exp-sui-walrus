# LAST PLAN

Generated at: 2026-06-16

## Current Objective
Build the next highest-priority experiment success surface: a small dashboard over the verified TradeProof harness.

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
Implement the UI as harness engineering:
- Add a local dashboard server using built-in Node APIs, not a new frontend framework.
- Add a compact dashboard with actions for evidence generation, Walrus verification, local proof execution, and state refresh.
- Make dashboard actions call the existing verified scripts instead of duplicating Sui/Walrus logic in frontend code.
- Persist the latest local demo summary to `artifacts/tradeproof/demo-summary.json`.
- Verify with `sui move build`, `npm test`, `npm run walrus:verify`, `npm run demo:local`, and browser inspection.

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
