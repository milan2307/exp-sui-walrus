# LOGIORACLE DEVELOPMENT HARNESS & AGENT RULES

## 1. Project Context
LogiOracle is Milan's Sui Move + Walrus build track for creating useful trade, shipment, invoice, and document-proof objects on Sui.

The current practical milestone is TradeProof v0.1:
- Sui Move object stores shipment or invoice proof state.
- Heavy evidence files live off-chain in Walrus.
- The Sui object stores only the lightweight `walrus_blob_id` reference.

This project supports Milan's goal to earn 100,000 SUI and 100,000 WAL by building real ecosystem utility, not by token speculation.

## 2. Non-Negotiable Build Constraints
- Build on Sui Move only.
- Do not install or build Rust/Cargo toolchains unless Milan explicitly asks.
- Use the local Sui CLI from MilanGPT OS when needed:
  `C:\Users\milan\Documents\MilanGPT-OS\.tools\sui\sui.exe`
- Use Walrus Memory (`memwal`) whenever available to recall durable project context and
  remember stable decisions or preferences that should survive future sessions.
- Never read, print, commit, or expose `~/.memwal/credentials.json` or any delegate key.
- Do not build wallets, DEXs, custody flows, money transmission, or regulated escrow in v0.1.
- Do not add placeholder code, TODO-only implementations, or fake tests.
- Keep every change tied to a working terminal proof.

## 3. Harness Loop
Before meaningful code edits:
1. Write or update `LAST_PLAN.md` with the concrete intended change.
2. Edit the smallest set of files required.
3. Run:
   `C:\Users\milan\Documents\MilanGPT-OS\.tools\sui\sui.exe move build`
4. If a Move test exists or should exist, run:
   `C:\Users\milan\Documents\MilanGPT-OS\.tools\sui\sui.exe move test`
5. If either command fails, read the error, fix the code, and rerun until green or until the blocker is genuinely external.
6. Update `STATUS.md` with what changed, verification output, and the next action.

## 4. Current Package
Primary package:
`logioracle/`

Current module:
`logioracle::shipment`

Current test:
`logioracle::logioracle_tests::creates_and_updates_shipment_proof`

## 5. Product Direction
TradeProof v0.1 should prove one simple workflow:
1. Create shipment or invoice proof.
2. Attach a Walrus blob reference.
3. Update lifecycle status.
4. Verify via Sui Move tests.

Walrus CLI/API integration comes after the Move object and tests are stable.
