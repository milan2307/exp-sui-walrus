# LAST PLAN

Generated at: 2026-06-16

## Current Objective
Complete the next highest-value experiment-success increment: official Walrus HTTP upload/read/verify commands for TradeProof evidence.

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
Option B is implemented and verified:
- `npm run walrus:upload` uploads deterministic evidence to the Walrus testnet HTTP publisher.
- `npm run walrus:read` retrieves the current manifest blob through the Walrus testnet aggregator.
- `npm run walrus:verify` hashes the retrieved bytes and compares them to the manifest `evidence_hash`.
- `npm run demo:local` now preserves and stores the official Walrus HTTP blob ID on the local Sui `Shipment` object.

Next practical change:
- Build a small dashboard only after it shells out to or mirrors the verified CLI flow.
- Keep `npm test`, `npm run walrus:verify`, and `npm run demo:local` as the acceptance gates.

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
