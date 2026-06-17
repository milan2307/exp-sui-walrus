# STATUS

Generated at: 2026-06-16

## Testnet Deploy

**Published to Sui Testnet — 2026-06-16**

```text
PackageID: 0x00cd2e5357027bc9e1210c790f842503c2eda56e5237bf046698e176a1bc7f61
Tx Digest: 83PsGZMKS8r6HYgejkutqNw45Camg67CBmH8H6AdyXp5
Publisher: 0xedc98afbb6a8bc2aa8197e76d37d0da2f30df2244741756cf1782ba3bc2d7305
Explorer: https://testnet.suivision.xyz/package/0x00cd2e5357027bc9e1210c790f842503c2eda56e5237bf046698e176a1bc7f61
```

## State
LogiOracle is deployed on Sui Testnet. The TradeProof v0.1 harness is complete: a Sui Move proof object, tested lifecycle updates, tested evidence-reference replacement, a repo-level `npm test` gate, an offline-first evidence/hash generator, a verified live Walrus HTTP upload path, and a public testnet package.

## BT-003 Gate Results — 2026-06-17

| Gate | Result | Detail |
|---|---|---|
| `sui --version` | PASS | `sui 1.73.1-ff1fe0ec4551-dirty` |
| `walrus --version` | PASS | `walrus 1.50.0-dac31b8cb87c` |
| logioracle builds | PASS | `BUILDING logioracle` clean |
| Move tests (≥1) | PASS | 4/4 — creates, entry, rejects-transition, rejects-unknown |

Walrus CLI path: `C:\Users\milan\Documents\MilanGPT-OS\.tools\walrus\walrus.exe`

## Verified Tooling
Sui CLI:

```text
sui 1.73.1-ff1fe0ec4551-dirty
```

CLI path:

```text
C:\Users\milan\Documents\MilanGPT-OS\.tools\sui\sui.exe
```

## Verified Build

```text
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING logioracle
```

## Verified Test

```text
> exp-sui-walrus@1.0.0 test
> node scripts/verify-logioracle.js

INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING logioracle
Running Move unit tests
[ PASS    ] logioracle::logioracle_tests::creates_and_updates_shipment_proof
[ PASS    ] logioracle::logioracle_tests::entry_creates_and_transfers_shipment_proof
Test result: OK. Total tests: 2; passed: 2; failed: 0
```

## Verified Evidence Harness

Command:

```powershell
npm run demo:evidence
```

Output:

```text
TradeProof evidence generated
Evidence: C:\Users\milan\Documents\exp-sui-walrus\artifacts\tradeproof\evidence.json
Manifest: C:\Users\milan\Documents\exp-sui-walrus\artifacts\tradeproof\manifest.json
proof_type=SHIPMENT
walrus_blob_id=pending-walrus-upload:8de30975b8e0d213
evidence_hash=sha256:8de30975b8e0d213f68411d254a568ce45842813a0e5bf09e2372d88bc3c3039
```

The `artifacts/` directory is ignored by git because those files are reproducible local outputs.
If `artifacts/tradeproof/memwal-receipt.json` exists, rerunning `npm run demo:evidence` preserves the real returned `walrus_blob_id` in the manifest.

## Verified MemWal Upload

Command:

```powershell
npm run demo:memwal
```

Output:

```text
MemWal upload completed
Manifest: C:\Users\milan\Documents\exp-sui-walrus\artifacts\tradeproof\manifest.json
Receipt: C:\Users\milan\Documents\exp-sui-walrus\artifacts\tradeproof\memwal-receipt.json
walrus_blob_id=W0WM4uNIsWH-bUnAknVAcaysaNd6qH2I1K44STn0b6s
job_id=04c64a9d-f9a1-4a51-abff-faacc02dac69
recall_matched=true
```

Current manifest values:

```text
proof_type=SHIPMENT
shipment_id=SHIP-001
walrus_blob_id=W0WM4uNIsWH-bUnAknVAcaysaNd6qH2I1K44STn0b6s
evidence_hash=sha256:8de30975b8e0d213f68411d254a568ce45842813a0e5bf09e2372d88bc3c3039
```

## Current Product Object
`logioracle::shipment::Shipment`

Fields:
- shipment_id
- proof_type
- origin
- destination
- walrus_blob_id
- evidence_hash
- status
- owner

## Transaction Harness

Added CLI-callable Move function:

```text
logioracle::shipment::create_and_transfer
```

Added helper commands:

```powershell
npm run publish:logioracle -- --print
npm run tx:shipment -- --package <published-package-id> --recipient <sui-address> --print
npm run tx:status -- --package <published-package-id> --object <shipment-object-id> --status DELIVERED --env local --execute
npm run verify:shipment -- --object <shipment-object-id> --env local
npm run demo:local
```

The transaction helper reads:

```text
artifacts/tradeproof/manifest.json
```

and maps these manifest fields into the Move call:

```text
shipment_id
proof_type
walrus_blob_id
evidence_hash
```

Current local Sui context:

```text
active_env=testnet
active_address=0xedc98afbb6a8bc2aa8197e76d37d0da2f30df2244741756cf1782ba3bc2d7305
```

Current external deploy blocker:

```text
sui client publish --dry-run
code: 'Unknown error', message: "transport error", source: tonic::transport::Error(Transport, NativeCertsNotFound)
Caused by: no native certs found
```

## Next Action
Local Sui transaction proof, readback verification, lifecycle status update, event emission, stricter Move status validation, the single-command local demo, and README usage docs are now working. Next, decide whether to fix the Windows testnet certificate blocker or add a query/indexer-facing demo for emitted events.

## Verified Local Sui Publish And Transaction

Local Sui env:

```text
local = http://127.0.0.1:9000
```

The publish helper now uses the Sui CLI's supported global env argument order:

```text
sui client --client.env local test-publish ...
```

For local/devnet ephemeral networks, it uses:

```text
test-publish --build-env testnet --pubfile-path artifacts/local-sui/Pub.local.toml
```

Local faucet gas was requested successfully for:

```text
0xedc98afbb6a8bc2aa8197e76d37d0da2f30df2244741756cf1782ba3bc2d7305
```

Local package publish succeeded:

```text
package_id=0x6a63b944d49b0d34f4c9e8ebe45a1076906b196c74b7e35ab79541c864a86af3
publish_digest=DtYTwyT3WMaYykz7hD8X6z7zmhFgLga5eKWC1eaocDdv
```

Local shipment transaction dry run succeeded, then execution succeeded:

```text
tx_digest=573FUmhHc869GGBpdDr2NnkVBY3RPgyf1qyLt1qYhnmM
shipment_object_id=0x2a888cbb3eef5bf1acfc190e08e0d47defea59a5f583aaf5ef638cf4718bd45d
```

Readback from local Sui confirmed the object content:

```text
shipment_id=SHIP-001
proof_type=SHIPMENT
origin=Nairobi
destination=Mombasa
status=CREATED
walrus_blob_id=W0WM4uNIsWH-bUnAknVAcaysaNd6qH2I1K44STn0b6s
evidence_hash=sha256:8de30975b8e0d213f68411d254a568ce45842813a0e5bf09e2372d88bc3c3039
```

## Verified Shipment Readback Helper

Added:

```text
scripts/verify-shipment-object.js
```

Command:

```powershell
npm run verify:shipment -- --object 0x2a888cbb3eef5bf1acfc190e08e0d47defea59a5f583aaf5ef638cf4718bd45d --package 0x6a63b944d49b0d34f4c9e8ebe45a1076906b196c74b7e35ab79541c864a86af3 --env local
```

Output:

```text
Shipment object verified
object=0x2a888cbb3eef5bf1acfc190e08e0d47defea59a5f583aaf5ef638cf4718bd45d
type=0x6a63b944d49b0d34f4c9e8ebe45a1076906b196c74b7e35ab79541c864a86af3::shipment::Shipment
owner=0xedc98afbb6a8bc2aa8197e76d37d0da2f30df2244741756cf1782ba3bc2d7305
shipment_id=SHIP-001
proof_type=SHIPMENT
status=CREATED
walrus_blob_id=W0WM4uNIsWH-bUnAknVAcaysaNd6qH2I1K44STn0b6s
evidence_hash=sha256:8de30975b8e0d213f68411d254a568ce45842813a0e5bf09e2372d88bc3c3039
```

## Verified Single-Command Local Demo

Added:

```text
scripts/run-local-demo.js
```

Command:

```powershell
npm run demo:local
```

The command runs:

```text
Move tests
Generate evidence
MemWal upload, or reuse an existing manifest walrus_blob_id
Start or reuse local Sui
Publish LogiOracle with a fresh ephemeral local pubfile
Execute create_and_transfer
Verify the created Shipment object against artifacts/tradeproof/manifest.json
Execute update_status to set status=DELIVERED
Verify the updated Shipment object status
```

Verified output:

```text
TradeProof local demo completed
memwal_upload=reused-existing-blob
package=0x53779a09c369316026f10b7ed8aa8639ea81d314080fdbc40af1eae3a74a44dc
shipment_object=0x5c9e603fb17c21afa76c5de814dce64e268e04fe99d5d53ce4a8ea8791ba5f9f
final_status=DELIVERED
walrus_blob_id=W0WM4uNIsWH-bUnAknVAcaysaNd6qH2I1K44STn0b6s
evidence_hash=sha256:8de30975b8e0d213f68411d254a568ce45842813a0e5bf09e2372d88bc3c3039
```

## Verified Lifecycle Status Update

Added:

```text
scripts/update-shipment-status.js
```

Command:

```powershell
npm run tx:status -- --package 0x892d4ead16f6c9196d62402e90b10df9afd486e516f430a81e8d0f58cf332fcf --object 0xc6a6aa8c8cbcde28641eb957d3d569192c88e4b341ef5125a151f8c61bf918f6 --status DELIVERED --env local --execute
```

Output:

```text
Transaction Digest: 2DYuz1zLkkbvd99EgPZ5WBGSNvbpjvjZu4ZjJxvmaiBB
Status: Success
```

Readback verification:

```powershell
npm run verify:shipment -- --object 0xc6a6aa8c8cbcde28641eb957d3d569192c88e4b341ef5125a151f8c61bf918f6 --package 0x892d4ead16f6c9196d62402e90b10df9afd486e516f430a81e8d0f58cf332fcf --env local --status DELIVERED
```

Output:

```text
Shipment object verified
status=DELIVERED
walrus_blob_id=W0WM4uNIsWH-bUnAknVAcaysaNd6qH2I1K44STn0b6s
evidence_hash=sha256:8de30975b8e0d213f68411d254a568ce45842813a0e5bf09e2372d88bc3c3039
```

## Verified README Local Loop Documentation

Updated:

```text
README.md
```

The README now documents:

```text
npm test
npm run demo:local
npm run tx:status
npm run verify:shipment
Localnet as the current working path
NativeCertsNotFound as the current testnet blocker
```

Verification:

```powershell
npm test
rg "demo:local|NativeCertsNotFound|tx:status|final_status|Current Next Action" README.md
```

Output:

```text
Test result: OK. Total tests: 2; passed: 2; failed: 0
npm run demo:local
final_status=DELIVERED
npm run tx:status -- --package <published-package-id> --object <shipment-object-id> --status DELIVERED --env local --execute
NativeCertsNotFound
## Current Next Action
```

## Verified Sui Event Emission

Added event structs in `logioracle::shipment`:

```text
ShipmentCreated
ShipmentStatusUpdated
ShipmentEvidenceUpdated
```

`npm run demo:local` verified Localnet event emission during the lifecycle update:

```text
EventType: 0xc3ca738dbcbd0d62ff20075e42374c1b45cdd9864030db714cfdb4dbd1552816::shipment::ShipmentStatusUpdated
new_status=DELIVERED
old_status=CREATED
shipment_id=SHIP-001
```

Final demo summary:

```text
TradeProof local demo completed
package=0xc3ca738dbcbd0d62ff20075e42374c1b45cdd9864030db714cfdb4dbd1552816
shipment_object=0x8697f2f738cef3cf4082f321f1c0e9204176935392835705cbc023f3ea8c6408
final_status=DELIVERED
walrus_blob_id=W0WM4uNIsWH-bUnAknVAcaysaNd6qH2I1K44STn0b6s
```

## Verified Status Validation

Move now accepts only these lifecycle statuses:

```text
CREATED
IN_TRANSIT
DELIVERED
```

Allowed transitions are:

```text
CREATED -> IN_TRANSIT
CREATED -> DELIVERED
IN_TRANSIT -> DELIVERED
```

Rejected cases are covered by Move tests:

```text
logioracle::logioracle_tests::rejects_unknown_status
logioracle::logioracle_tests::rejects_backwards_status_transition
```

Verification:

```text
Test result: OK. Total tests: 4; passed: 4; failed: 0
```

Latest local demo proof:

```text
TradeProof local demo completed
package=0xb8374231bada9c6d15bc4dc6cbf1cb20c89dbea9f4253ea99b86fa019d384a40
shipment_object=0x415bb3b8b2bd9d7f96507ecef96db70866eb17050ddd59a7fa0b1ed47f2db5d2
final_status=DELIVERED
walrus_blob_id=W0WM4uNIsWH-bUnAknVAcaysaNd6qH2I1K44STn0b6s
```

## Verified Session Handoff Notes

Added:

```text
NOTES_FOR_NEXT_SESSION.md
```

Purpose:

```text
Record the current TradeProof / LogiOracle repo state before any new build changes.
```

The note captures:

```text
Sui Move smart contract status
Local-first TradeProof v0.1 proof loop
Working npm and Sui CLI commands
GitHub branch and draft PR context
NativeCertsNotFound testnet blocker
Recommended next build options A, B, C, or D
```

Verification:

```text
C:\Users\milan\Documents\MilanGPT-OS\.tools\sui\sui.exe move build

INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING logioracle
```

```text
npm test

Running Move unit tests
[ PASS    ] logioracle::logioracle_tests::creates_and_updates_shipment_proof
[ PASS    ] logioracle::logioracle_tests::entry_creates_and_transfers_shipment_proof
[ PASS    ] logioracle::logioracle_tests::rejects_backwards_status_transition
[ PASS    ] logioracle::logioracle_tests::rejects_unknown_status
Test result: OK. Total tests: 4; passed: 4; failed: 0
```

## Verified Localnet Event Readback

Added:

```text
scripts/verify-shipment-events.js
npm run verify:events
```

The helper reads Localnet transaction blocks through the Sui CLI and verifies emitted lifecycle events:

```text
ShipmentCreated
ShipmentStatusUpdated
```

When the Localnet query succeeds, the helper writes a reproducible local proof artifact:

```text
artifacts/tradeproof/events-proof.json
```

That artifact is ignored by git with the rest of `artifacts/`. A later `npm run verify:events` can validate the saved proof if the ephemeral Localnet no longer serves the transaction block digest.

`npm run demo:local` now captures the create and status transaction digests, verifies the created and updated `Shipment` object states, then verifies the lifecycle events from those transaction blocks.

Verification:

```text
C:\Users\milan\Documents\MilanGPT-OS\.tools\sui\sui.exe move build

INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING logioracle
```

```text
npm test

Running Move unit tests
[ PASS    ] logioracle::logioracle_tests::creates_and_updates_shipment_proof
[ PASS    ] logioracle::logioracle_tests::entry_creates_and_transfers_shipment_proof
[ PASS    ] logioracle::logioracle_tests::rejects_backwards_status_transition
[ PASS    ] logioracle::logioracle_tests::rejects_unknown_status
Test result: OK. Total tests: 4; passed: 4; failed: 0
```

```text
npm run demo:local

Shipment lifecycle events verified
package=0x042019f64b84b69aaff52d4033721e488a502e283607bc10d2876d1098eb4b80
env=local
proof_source=localnet
shipment_id=SHIP-001
created_tx=8dLw6MeUi9TjgjthNveCEpyNXgpq8rro7efKtPSXJRkM
created_event=0x042019f64b84b69aaff52d4033721e488a502e283607bc10d2876d1098eb4b80::shipment::ShipmentCreated
status_tx=2VvgzEe3kLDkH3tdZbj4F3HEwugHmWwEQwKCTeifGvr9
status_event=0x042019f64b84b69aaff52d4033721e488a502e283607bc10d2876d1098eb4b80::shipment::ShipmentStatusUpdated
old_status=CREATED
new_status=DELIVERED

TradeProof local demo completed
memwal_upload=reused-existing-blob
package=0x042019f64b84b69aaff52d4033721e488a502e283607bc10d2876d1098eb4b80
shipment_object=0x21fc7f2d4760a7fcf1562ca9949a2653fe3170781407e7590b21d99b410764eb
create_tx=8dLw6MeUi9TjgjthNveCEpyNXgpq8rro7efKtPSXJRkM
status_tx=2VvgzEe3kLDkH3tdZbj4F3HEwugHmWwEQwKCTeifGvr9
final_status=DELIVERED
walrus_blob_id=W0WM4uNIsWH-bUnAknVAcaysaNd6qH2I1K44STn0b6s
evidence_hash=sha256:8de30975b8e0d213f68411d254a568ce45842813a0e5bf09e2372d88bc3c3039
```

Standalone verification of the saved proof:

```text
npm run verify:events -- --package 0x042019f64b84b69aaff52d4033721e488a502e283607bc10d2876d1098eb4b80 --create-digest 8dLw6MeUi9TjgjthNveCEpyNXgpq8rro7efKtPSXJRkM --status-digest 2VvgzEe3kLDkH3tdZbj4F3HEwugHmWwEQwKCTeifGvr9 --env local

Shipment lifecycle events verified
proof_source=C:\Users\milan\Documents\exp-sui-walrus\artifacts\tradeproof\events-proof.json
old_status=CREATED
new_status=DELIVERED
```

## Verified Official Walrus HTTP Evidence Path

Added:

```text
BUILD_PRIORITIES.md
scripts/walrus-http-upload.js
scripts/walrus-http-read.js
scripts/walrus-http-verify.js
npm run walrus:upload
npm run walrus:read
npm run walrus:verify
```

Priority decision:

```text
The UI should not be the primary testing surface yet. The highest-value next step was official Walrus upload/read/verify, because the product claim depends on proving that the blob referenced on Sui can be retrieved from Walrus and hashed back to the on-chain evidence_hash.
```

Walrus docs alignment:

```text
Upload: PUT $PUBLISHER/v1/blobs
Read: GET $AGGREGATOR/v1/blobs/<BLOB_ID>
Default publisher: https://publisher.walrus-testnet.walrus.space
Default aggregator: https://aggregator.walrus-testnet.walrus.space
```

Verification:

```text
npm run walrus:upload

Walrus HTTP upload completed
walrus_blob_id=I8621DDJDxpOiuaqMV_ZnMmVJx3Zc42EtdoQx4v7ux8
evidence_hash=sha256:8de30975b8e0d213f68411d254a568ce45842813a0e5bf09e2372d88bc3c3039
```

## Verified Local Dashboard Harness

Added:

```text
scripts/dashboard-server.js
web/dashboard/index.html
web/dashboard/app.js
web/dashboard/styles.css
npm run dashboard
```

The dashboard is intentionally a harness UI over the verified commands. It does not reimplement Sui or Walrus logic in the browser.

Action mapping:

```text
Evidence -> scripts/create-tradeproof-evidence.js
Upload -> scripts/walrus-http-upload.js
Verify -> scripts/walrus-http-verify.js
Create -> scripts/run-local-demo.js
Tests -> scripts/verify-logioracle.js
Refresh -> GET /api/state
```

Important harness fix:

```text
scripts/run-local-demo.js now requests JSON output from create/update transaction helpers, extracts object IDs, digests, and events from the actual transaction responses, and writes artifacts/tradeproof/events-proof.json plus artifacts/tradeproof/demo-summary.json.
```

This removed the weaker dependency on `sui client tx-block`, which was not reliably returning fresh Localnet transaction blocks after execution.

Dashboard verification:

```text
npm run dashboard
GET http://127.0.0.1:4173/ -> 200
GET http://127.0.0.1:4173/api/state -> returned manifest, Walrus receipt, verification, event proof, and demo summary
POST http://127.0.0.1:4173/api/run/walrusVerify -> ok=true
POST http://127.0.0.1:4173/api/run/moveTest -> ok=true
```

Latest local demo summary:

```text
package=0x354135b65b39f2e09c8f89a5066567632cb413ac9c8ff8d8aee11ddc8e3e5760
shipment_object=0xdc692c6a496bed65893970a05b5999c1f14974b5a0892943beb432d6b0a3c232
create_tx=G35J7Tcwd3Hp9YY3vewpe3i9xaNrX7554NGFKLV53sgh
status_tx=6U5vdL3F5WY59XyZUuUgqDDtCbZuE91C4xUXUZaXBRFL
final_status=DELIVERED
walrus_blob_id=I8621DDJDxpOiuaqMV_ZnMmVJx3Zc42EtdoQx4v7ux8
evidence_hash=sha256:8de30975b8e0d213f68411d254a568ce45842813a0e5bf09e2372d88bc3c3039
```

Verification:

```text
npm test
npm run walrus:verify
npm run demo:local
```

```text
npm run walrus:verify

Walrus HTTP evidence verified
aggregator=https://aggregator.walrus-testnet.walrus.space
walrus_blob_id=I8621DDJDxpOiuaqMV_ZnMmVJx3Zc42EtdoQx4v7ux8
bytes=381
evidence_hash=sha256:8de30975b8e0d213f68411d254a568ce45842813a0e5bf09e2372d88bc3c3039
```

`scripts/create-tradeproof-evidence.js` now preserves an existing official Walrus HTTP receipt before falling back to a MemWal receipt. This keeps `npm run demo:local` from replacing the official Walrus blob ID with an older MemWal blob ID.

Latest local demo with official Walrus blob ID:

```text
npm run demo:local

TradeProof local demo completed
memwal_upload=not-needed
package=0xc9129f3ffc48d02ff4c4fd8cc86d1f4c686444f211da1ebb8f18eac70a9c0c26
shipment_object=0x161298debff75568521219b283f14361421f87cdce83364a28ca9556bb62d0d4
create_tx=A7k8ZzSiYJF9xeCn2zBnxUKL6daVPRz6z7TXJmaCL8Xe
status_tx=DZjzGdji4Ksmz3jrnMfW8F2pe11aambmUL2op1N9eVCP
final_status=DELIVERED
walrus_blob_id=I8621DDJDxpOiuaqMV_ZnMmVJx3Zc42EtdoQx4v7ux8
evidence_hash=sha256:8de30975b8e0d213f68411d254a568ce45842813a0e5bf09e2372d88bc3c3039
```
