# LAST PLAN

Generated at: 2026-06-16

## Current Objective
Continue the fastest useful TradeProof v0.1 harness on top of the existing LogiOracle package.

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
Choose the next post-v0.1 hardening target:
- Keep the Move test harness green.
- Option A: fix the Windows testnet native certificate blocker and publish to testnet.
- Option B: add a query/indexer-facing demo for emitted Sui events.
- Option C: add invoice proof shape after the shipment loop remains stable.
- Keep local-first proof commands working regardless of the chosen increment.

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
