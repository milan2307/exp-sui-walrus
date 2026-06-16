# Build Priorities

Generated at: 2026-06-16

## Current Goal

Move TradeProof / LogiOracle from a local smart-contract experiment into a credible Sui + Walrus proof product.

## Testing Position

Current testing is terminal-first:

- Move unit tests verify the smart contract object and lifecycle rules.
- Localnet transactions verify object creation, transfer, status update, object readback, and event readback.
- Evidence harnesses verify deterministic evidence bytes and hashes.

A UI is useful soon, but it should not become the main testing surface yet. Milan can test the CLI workflow now because it proves the real system path. A UI should come after official Walrus read/write verification is working so the interface does not hide weak infrastructure.

## Ranked Tasks

1. Official Walrus HTTP upload/read/verify. Completed.
   - Why: This removes the biggest product gap. The repo already stores a `walrus_blob_id` on Sui, but the strongest next proof is retrieving the blob through Walrus and matching the on-chain hash.
   - Success proof: `npm run walrus:upload`, `npm run walrus:verify`, and `npm run demo:local` all pass.

2. On-chain Walrus metadata awareness.
   - Why: The Move object currently stores a blob reference as a string. A later version should check Walrus blob object availability/lifetime where possible.
   - Success proof: Move code can reason about a Walrus object or a verified availability marker without storing the full file.

3. Small operator/user dashboard.
   - Why: Once the CLI proof is strong, a simple dashboard makes the workflow testable by hand.
   - Scope: Create Shipment Proof, View Shipment Proof, Verify Evidence, Update Status.

4. Testnet deployment blocker.
   - Why: Public network proof matters, but the current Windows Sui CLI `NativeCertsNotFound` issue is external to the product loop.
   - Success proof: package publish dry-run and real testnet publish succeed.

5. Invoice proof shape.
   - Why: Invoices are the second obvious trade proof type, but they should reuse the hardened evidence/storage verification path.

6. Indexer/query surface.
   - Why: Event readback works locally. A broader event query/indexer path matters after the deployed network path exists.

## Current Top Priority

Next priority is a small operator/user dashboard only if it sits on top of the verified CLI commands. The UI should expose the existing proof loop rather than replace it.
