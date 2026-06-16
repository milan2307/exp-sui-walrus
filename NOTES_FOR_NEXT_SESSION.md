# exp-sui-walrus - Current State Notes

This repo is a 7-day experiment spun from MilanGPT OS. The product direction is TradeProof / LogiOracle: a Sui + Walrus/Walrus Memory proof system for logistics evidence.

## What we are building

We are building a local-first Sui smart contract proof-of-concept that stores and verifies Walrus/MemWal evidence references for shipment data.

Pattern:

Evidence file/document
-> upload or reuse Walrus/MemWal blob
-> get walrus_blob_id
-> store walrus_blob_id + sha256 evidence_hash in a Sui Move Shipment object
-> verify later by reading the Sui object and comparing it against artifacts/tradeproof/manifest.json.

## Current architecture

- Sui Move smart contract/module:
  - logioracle/sources/shipment.move

- Tests:
  - logioracle/tests/logioracle_tests.move
  - npm test currently runs Move verification through scripts/verify-logioracle.js

- Main local demo:
  - npm run demo:local

## Current working features

The current local TradeProof v0.1 loop can:

1. Run Sui Move tests.
2. Generate deterministic evidence.
3. Create/update artifacts/tradeproof/manifest.json.
4. Reuse an existing MemWal/Walrus blob ID or upload if pending.
5. Start or reuse local Sui HTTP network.
6. Publish logioracle locally using Sui CLI Localnet/test-publish.
7. Create and transfer a Shipment proof object.
8. Verify the created Shipment object against the manifest.
9. Update lifecycle status to DELIVERED.
10. Verify updated object state.
11. Emit Sui events.
12. Read Localnet transaction blocks and verify lifecycle events.
13. Validate lifecycle status values and transitions.

## Important working commands

```powershell
npm test

npm run demo:local

npm run demo:evidence

npm run demo:memwal

npm run walrus:upload

npm run walrus:read

npm run walrus:verify

npm run local:sui

npm run publish:logioracle -- --env local --execute

npm run tx:shipment -- --package <published-package-id> --env local --recipient <sui-address> --execute

npm run tx:status -- --package <published-package-id> --object <shipment-object-id> --status DELIVERED --env local --execute

npm run verify:shipment -- --object <shipment-object-id> --package <published-package-id> --env local --status DELIVERED

npm run verify:events -- --package <published-package-id> --create-digest <create-tx-digest> --status-digest <status-tx-digest> --env local
```

## Smart contract status

Yes, this repo is building smart contracts.

The Sui Move module creates and manages a Shipment object with fields like:

- shipment_id
- proof_type
- origin
- destination
- status
- walrus_blob_id
- evidence_hash
- owner

The smart contract currently stores proof references, not full documents.

## Events already added

The Move module emits Sui events:

- ShipmentCreated
- ShipmentStatusUpdated
- ShipmentEvidenceUpdated

## Status validation already added

Allowed statuses:

- CREATED
- IN_TRANSIT
- DELIVERED

Allowed transitions:

- CREATED -> IN_TRANSIT
- CREATED -> DELIVERED
- IN_TRANSIT -> DELIVERED

Rejected cases are covered by tests:

- rejects_unknown_status
- rejects_backwards_status_transition

Expected current test result:

```text
Test result: OK. Total tests: 4; passed: 4; failed: 0
```

## GitHub state

The work was pushed to GitHub.

Repo:
https://github.com/milan2307/exp-sui-walrus

Branch:
codex/tradeproof-v0.1-local-demo

Draft PR:
https://github.com/milan2307/exp-sui-walrus/pull/1

Recent commits:

- Add TradeProof local demo harness
- Emit TradeProof lifecycle events
- Validate TradeProof lifecycle statuses

Before continuing, check git status and confirm whether this branch is clean and pushed.

## Important distinction

This project is aligned with the Walrus docs at https://docs.wal.app/, but it is not yet a full production Walrus integration.

Current state:

- Sui smart contract: yes
- Local Sui transactions: yes
- Blob ID stored on-chain: yes
- Hash stored on-chain: yes
- Local verification: yes
- MemWal/Walrus Memory path: yes/partial
- Official Walrus HTTP upload/read/verify path: in progress
- Official raw Walrus CLI/SDK production integration: not fully done yet
- Testnet deployment: blocked
- Mainnet deployment: not done

## Known blocker

External Sui testnet publish is currently blocked on Windows by:

```text
NativeCertsNotFound
```

Localnet is the current working terminal-proof path.

Do not treat testnet publish as the next milestone until that certificate issue is fixed.

## Recommended next build options

Pick only one next increment.

Option A - completed:
An event read script now fetches emitted lifecycle events from Localnet transaction blocks and proves ShipmentCreated and ShipmentStatusUpdated can be observed.

Option B - completed:
Official Walrus HTTP upload/read/verify commands now upload deterministic evidence to the Walrus testnet publisher, read it through the testnet aggregator, hash the retrieved bytes, and confirm the hash matches the manifest.

Suggested commands:

```powershell
npm run walrus:upload
npm run walrus:read
npm run walrus:verify
```

Goal:
Upload evidence to Walrus, retrieve it, hash it, and confirm the retrieved hash matches the on-chain evidence_hash.

Option C - network step:
Fix the Windows Sui CLI NativeCertsNotFound issue and try testnet publish.

Option D - user-facing step:
Build a simple UI dashboard:

- Create Shipment Proof
- View Shipment Proof
- Verify Evidence
- Update Status

## Instruction for Codex

Before writing code:

1. Run git status -sb.
2. Run npm test.
3. Read README.md, STATUS.md, LAST_PLAN.md, package.json, logioracle/sources/shipment.move, and logioracle/tests/logioracle_tests.move.
4. Summarize the current state in your own words.
5. Ask Milan which next option to implement: A, B, C, or D.

Do not make large changes immediately.
Do not expose or commit private keys, credentials.json, .env files, or delegate private keys.
Keep local-first proof commands working, and later push to GitHub.
