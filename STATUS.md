# STATUS

Generated at: 2026-06-16

## State
LogiOracle now has a working TradeProof v0.1 harness: a Sui Move proof object, tested lifecycle updates, tested evidence-reference replacement, a repo-level `npm test` gate, an offline-first evidence/hash generator, and a verified live MemWal upload path.

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
Local Sui transaction proof, readback verification, lifecycle status update, event emission, the single-command local demo, and README usage docs are now working. Next, choose whether to add stricter Move status values or fix the Windows testnet certificate blocker.

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
