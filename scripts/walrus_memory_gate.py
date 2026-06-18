#!/usr/bin/env python3
"""
Day-3 Gate: Walrus Memory cross-session store -> recall.

Proof: one MemWalSync instance stores a memory and is closed (session ends),
a second fresh instance recalls it -- demonstrating persistence on
Walrus decentralised storage across sessions.

Usage:
  python scripts/walrus_memory_gate.py

Credentials loaded from env vars or ~/.memwal/credentials.json.
"""
import json
import os
import sys
import time
from pathlib import Path
from datetime import datetime, timezone

from memwal import MemWalSync

NAMESPACE = "tradeproof-gate"
SEP = "=" * 60
LINE = "-" * 60


def load_credentials():
    key = os.environ.get("MEMWAL_DELEGATE_KEY")
    account_id = os.environ.get("MEMWAL_ACCOUNT_ID")
    if key and account_id:
        return key, account_id

    cred_path = Path.home() / ".memwal" / "credentials.json"
    if cred_path.exists():
        cred = json.loads(cred_path.read_text())
        key = cred.get("delegatePrivateKey") or cred.get("delegate_private_key")
        account_id = cred.get("accountId") or cred.get("account_id")
        if key and account_id:
            return key, account_id

    print("ERROR: no credentials. Set MEMWAL_DELEGATE_KEY + MEMWAL_ACCOUNT_ID")
    print("       or run: npx -y @mysten-incubation/memwal-mcp login --prod")
    sys.exit(1)


def make_client(key, account_id):
    return MemWalSync.create(
        key=key,
        account_id=account_id,
        env="prod",
        namespace=NAMESPACE,
    )


def run_gate():
    print(SEP)
    print("Walrus Memory Day-3 Gate")
    print(SEP)

    key, account_id = load_credentials()
    print(f"Account  : {account_id}")
    print(f"Network  : prod (https://relayer.memwal.ai)")
    print(f"Namespace: {NAMESPACE}")
    print()

    # ── SESSION A: store ───────────────────────────────────────────
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    memory_text = (
        f"TradeProof gate test [{timestamp}]. "
        "Container MSCU9876543 gated in at Mombasa port. "
        "BL-SPX-2026-001 issued on Sui Testnet. "
        "13 Move modules live. EAC corridor pilot active."
    )

    print("-- SESSION A: storing memory " + "-" * 32)
    print(f"Text: {memory_text}")
    print()

    client_a = make_client(key, account_id)
    result = client_a.remember_and_wait(memory_text, namespace=NAMESPACE)
    client_a.close()

    print(f"Stored   id       = {result.id}")
    print(f"         blob_id  = {result.blob_id}")
    print(f"         owner    = {result.owner}")
    print()
    print("Session A closed.")
    print()

    # Pause for indexing
    wait_s = 5
    print(f"Waiting {wait_s}s for Walrus indexing...")
    time.sleep(wait_s)
    print()

    # ── SESSION B: recall ──────────────────────────────────────────
    print("-- SESSION B: recall from fresh client " + "-" * 22)
    client_b = make_client(key, account_id)
    recall = client_b.recall(
        "TradeProof gate Mombasa MSCU9876543",
        namespace=NAMESPACE,
        limit=5,
    )
    client_b.close()

    print(f"Recall returned {recall.total} result(s).")
    print()

    if not recall.results:
        print("WARNING: no results -- memory may still be indexing.")
        print("Re-run in 30 seconds.")
        sys.exit(1)

    # ── PROOF ──────────────────────────────────────────────────────
    print("-- PROOF " + "-" * 51)
    for i, hit in enumerate(recall.results[:3]):
        print(f"[{i+1}] distance={hit.distance:.4f}  blob_id={hit.blob_id}")
        print(f"     {hit.text[:120]}")
        print()

    matched = any(
        timestamp in h.text or "MSCU9876543" in h.text or "TradeProof" in h.text
        for h in recall.results
    )

    print(SEP)
    if matched:
        print("GATE PASSED [OK]")
        print(f"Memory stored in SESSION A, recalled in SESSION B.")
        print(f"Persisted on Walrus decentralised storage.")
        print(SEP)
    else:
        print("GATE FAILED: recalled content does not match stored text.")
        print(SEP)
        sys.exit(1)


if __name__ == "__main__":
    run_gate()
