# exp-sui-walrus

## Purpose

This repository is Milan's Sui/Walrus learning and build track.

It is separate from `MilanGPT-OS`. MilanGPT OS is the operating system and agent brain; this repo is where Sui Move, Walrus, LogiOracle, and TradeProof experiments live.

## Current Direction

Current practical milestone:

```text
TradeProof v0.1
```

TradeProof v0.1 should prove one simple workflow:

1. Create a shipment or invoice proof object on Sui.
2. Store heavy evidence off-chain in Walrus.
3. Save only the lightweight `walrus_blob_id` reference in the Sui object.
4. Update proof lifecycle status.
5. Verify behavior with Sui Move tests.

## Current Package

Primary package:

```text
logioracle/
```

Current module:

```text
logioracle::shipment
```

Current proof object:

```text
Shipment
```

Current tests:

```text
logioracle::logioracle_tests::creates_and_updates_shipment_proof
logioracle::logioracle_tests::entry_creates_and_transfers_shipment_proof
logioracle::logioracle_tests::rejects_unknown_status
logioracle::logioracle_tests::rejects_backwards_status_transition
```

## Verification

Fast repo-level test gate:

```powershell
npm test
```

One-command local TradeProof v0.1 demo:

```powershell
npm run demo:local
```

That command runs the full local loop:

1. Run Sui Move tests.
2. Generate deterministic evidence and `artifacts/tradeproof/manifest.json`.
3. Reuse an existing MemWal `walrus_blob_id`, or upload to MemWal if the manifest is still pending.
4. Start or reuse the local Sui HTTP network.
5. Publish `logioracle` locally with a fresh ephemeral publication file.
6. Create and transfer a `Shipment` proof object.
7. Verify the created object against the manifest.
8. Update the object status to `DELIVERED`.
9. Verify the updated object state.
10. Verify emitted lifecycle events from the Localnet transaction blocks.

The Move module emits Sui events for:

```text
ShipmentCreated
ShipmentStatusUpdated
ShipmentEvidenceUpdated
```

Lifecycle status values are validated in Move:

```text
CREATED
IN_TRANSIT
DELIVERED
```

Allowed transitions are forward-only:

```text
CREATED -> IN_TRANSIT
CREATED -> DELIVERED
IN_TRANSIT -> DELIVERED
```

Expected final summary:

```text
TradeProof local demo completed
create_tx=<create-transaction-digest>
status_tx=<status-update-transaction-digest>
final_status=DELIVERED
walrus_blob_id=<walrus-or-memwal-blob-id>
evidence_hash=<sha256:...>
```

Individual harness commands:

```powershell
npm run demo:evidence
npm run demo:memwal
npm run local:sui
npm run publish:logioracle -- --env local --execute
npm run tx:shipment -- --package <published-package-id> --env local --recipient <sui-address> --execute
npm run tx:status -- --package <published-package-id> --object <shipment-object-id> --status DELIVERED --env local --execute
npm run verify:shipment -- --object <shipment-object-id> --package <published-package-id> --env local --status DELIVERED
npm run verify:events -- --package <published-package-id> --create-digest <create-tx-digest> --status-digest <status-tx-digest> --env local
npm run publish:logioracle -- --print
npm run tx:shipment -- --package <published-package-id> --recipient <sui-address> --print
```

`npm run demo:evidence` writes reproducible local evidence files under:

```text
artifacts/tradeproof/
```

`npm run demo:local` also writes `artifacts/tradeproof/events-proof.json` after it verifies lifecycle events from Localnet transaction blocks. `npm run verify:events` can validate that saved proof if the ephemeral Localnet no longer serves an older transaction digest.

The generated manifest emits the exact values that map to the Move object:

```text
proof_type
walrus_blob_id
evidence_hash
```

`npm run demo:memwal` uploads the generated evidence through MemWal when these `.env` values are present:

```text
MEMWAL_PRIVATE_KEY
MEMWAL_ACCOUNT_ID
MEMWAL_SERVER_URL
```

The script writes a local receipt to:

```text
artifacts/tradeproof/memwal-receipt.json
```

After a successful upload, the manifest is updated with the real returned `walrus_blob_id`. Later `npm run demo:evidence` runs preserve that value when `artifacts/tradeproof/memwal-receipt.json` exists.

To move from local harness to Sui transaction:

```powershell
npm run publish:logioracle -- --env local --execute
npm run tx:shipment -- --package <published-package-id> --env local --recipient <sui-address> --execute
```

Without `--execute`, the publish helper defaults to dry-run and the shipment transaction helper defaults to `--dry-run`.

For `local` and `devnet`, the publish helper uses Sui's ephemeral `test-publish` path with a repo-local publication file. This keeps the user's active Sui environment unchanged while still producing a real Localnet package and transaction proof.

From:

```powershell
cd C:\Users\milan\Documents\exp-sui-walrus\logioracle
```

Run:

```powershell
C:\Users\milan\Documents\MilanGPT-OS\.tools\sui\sui.exe move test
```

Known verified Sui CLI:

```text
sui 1.73.1-ff1fe0ec4551-dirty
```

## Current Network Boundary

The working path is Localnet:

```text
local = http://127.0.0.1:9000
```

External testnet publish is currently blocked on this Windows CLI error:

```text
transport error
NativeCertsNotFound
no native certs found
```

Do not treat testnet publish as the next milestone until that certificate issue is fixed. The Localnet path is the current terminal-proof path for TradeProof v0.1.

## Repository Rules

- Do not commit `.env`, wallets, keys, Sui keystores, or private credentials.
- Do not mix raw Speedex/client files into this repo.
- Do not treat Speedex operations and LogiOracle as the same project.
- Keep Sui/Walrus experiments small, testable, and tied to terminal proof.
- Update `STATUS.md` after meaningful build progress.
- Update `LAST_PLAN.md` before starting the next focused change.

## Relationship To MilanGPT OS

Use this repo for blockchain build work.

When a result, blocker, or decision matters, summarize it back into:

```text
C:\Users\milan\Documents\MilanGPT-OS
```

Recommended handoff format:

```text
Project:
What I tried:
Command/result:
Blocker:
Decision needed:
Next action:
```

## Current Next Action

Polish the v0.1 demo surface and then decide whether to fix the Windows testnet certificate issue or keep building local-first features.
