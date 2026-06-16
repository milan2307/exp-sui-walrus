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

Current test:

```text
logioracle::logioracle_tests::creates_and_updates_shipment_proof
```

## Verification

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

Install or locate Walrus CLI, then add a local demo flow that stores a document/blob and records its blob ID into the Sui Move proof object model.
