# Tomorrow Prompts - TradeProof / LogiOracle

Generated at: 2026-06-16

## Alignment

TradeProof / LogiOracle is now a harness-first Sui + Walrus proof product:

- Sui Move stores the programmable proof object.
- Walrus stores the heavy evidence bytes.
- The Sui object stores `walrus_blob_id` and `evidence_hash`.
- The local harness proves evidence generation, Walrus upload/read/hash verification, Sui object creation, lifecycle update, object readback, and event proof.
- The dashboard is a control panel over verified commands, not a replacement for the proof harness.

The operating principle is harness engineering over prompt engineering:

```text
Do not claim what the terminal cannot prove.
Do not build UI flows that bypass the verified CLI path.
Do not add fake demos, placeholder proofs, or TODO-only implementations.
```

## Share Copy

Short version:

```text
TradeProof is a Sui + Walrus proof harness for logistics evidence. It uploads deterministic shipment evidence to Walrus, stores the Walrus blob ID and evidence hash in a Sui Move Shipment object, updates lifecycle status, and verifies the full path through local Sui transactions, Walrus retrieval, hash comparison, object readback, and Sui event proof.
```

Builder version:

```text
I am building LogiOracle TradeProof: a local-first Sui Move + Walrus verification harness for trade and logistics evidence. The current prototype proves a full shipment workflow: generate evidence, upload/read/verify it through Walrus HTTP, store the blob ID and sha256 hash in a Sui Move object, update lifecycle status, verify object state, and capture lifecycle events. A small dashboard now runs the real proof commands instead of simulating them.
```

RFP/challenge version:

```text
TradeProof demonstrates verifiable data infrastructure for high-stakes logistics workflows. It combines programmable Sui Move objects with always-available Walrus evidence storage. The prototype emphasizes reproducible terminal proof: every product claim is backed by commands that build, test, upload, retrieve, hash, transact, read back, and verify event output.
```

## Hands-On Test Prompt For Milan

```text
I want to test TradeProof hands-on today. Start the dashboard, run Verify, Tests, and Create, then explain what each result proves and what files changed under artifacts/tradeproof.
```

Expected commands:

```powershell
npm run dashboard
npm run walrus:verify
npm test
npm run demo:local
```

Open:

```text
http://127.0.0.1:4173
```

## Tomorrow Start Prompt For Codex

```text
We are in C:\Users\milan\Documents\exp-sui-walrus. Continue TradeProof / LogiOracle from the pushed dashboard harness. First run git status -sb, npm test, npm run walrus:verify, and read README.md, STATUS.md, LAST_PLAN.md, BUILD_PRIORITIES.md, TOMORROW_PROMPTS.md, package.json, logioracle/sources/shipment.move, and logioracle/tests/logioracle_tests.move. Summarize the current state in plain English. Then proceed with the next highest-priority task that keeps the harness proof green.
```

## Next Priority Candidates

1. Harden dashboard step flow.
   - Split Create into smaller visible steps: generate evidence, verify Walrus, publish local package, create object, update status, verify events.
   - Keep each step backed by a script.

2. Add invoice proof shape.
   - Reuse the same evidence/Walrus/hash/status harness.
   - Avoid regulated escrow, payments, wallets, or custody logic.

3. Improve testnet blocker notes.
   - Investigate `NativeCertsNotFound` without making testnet the main milestone.

4. Add a PR-ready demo checklist.
   - One page listing commands, expected output, and what each proof means.

## Current Known Good Proof

```text
walrus_blob_id=I8621DDJDxpOiuaqMV_ZnMmVJx3Zc42EtdoQx4v7ux8
evidence_hash=sha256:8de30975b8e0d213f68411d254a568ce45842813a0e5bf09e2372d88bc3c3039
final_status=DELIVERED
```

Latest pushed branch:

```text
codex/tradeproof-v0.1-local-demo
```

Draft PR:

```text
https://github.com/milan2307/exp-sui-walrus/pull/1
```
