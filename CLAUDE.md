# exp-sui-walrus — Claude Code Session Context

Experiment repo spun from MilanGPT OS (`C:\Users\milan\Documents\MilanGPT-OS`).
Read that repo's CLAUDE.md for full owner context before any session here.

---

## Owner

**Milan** — entrepreneur building financial freedom through AI systems, automation, and digital assets.
This experiment feeds directly into the MilanGPT OS asset registry and opportunity pipeline.
See MilanGPT OS CLAUDE.md for operating rules, ARK megatrend framework, and build standards.

---

## Experiment Mission

7-day experiment with two parallel tracks:

- **Track 1 (days 1–3):** Integrate Walrus Memory as a portable memory layer for AI agents
- **Track 2 (days 3–7):** Set up Sui Move development environment for the RFP build

Every output must move toward an asset, revenue, or reusable system (MilanGPT OS rule).

---

## Completion Gates

### Day-3 Gate — Track 1 (Walrus Memory)
A Python script that:
1. Stores a memory using the `memwal` SDK in a fresh session
2. Terminates that session
3. Recalls the memory in a new session

**Proof:** Script runs end-to-end with printed output showing store → recall across sessions.

### Day-7 Gate — Track 2 (Sui Move)
A Move package that:
1. Compiles with `sui move build` (no errors)
2. Has at least one test that passes with `sui move test`

**Proof:** Terminal output showing `sui move build` and `sui move test` green on a local hello-world package.

---

## Track 1 — Walrus Memory Setup

### What Walrus Memory Is
Walrus Memory (memory.walrus.xyz) is a portable, encrypted, verifiable memory layer for AI agents.
Memory is stored on Walrus decentralised storage (built on Sui), persists across sessions, models,
and vendors. Key pillars: verifiability, availability, portability, shareability.

The Python SDK is `memwal` (`pip install memwal`).
MCP server: `@mysten-incubation/memwal-mcp` (Node.js 20+ required).

### Accounts and Keys Required

| What | Where | Notes |
|------|-------|-------|
| Walrus Memory account | memory.walrus.xyz — click Sign In | Google/zkLogin or Sui wallet |
| Delegate private key | Auto-generated at `~/.memwal/credentials.json` after browser login | **Never commit — already in .gitignore** |
| Account ID | Same credentials file | Used by SDK and MCP server |

Currently free for builders during launch period. No payment method required at signup.

### Setup Steps (Track 1 Day 1)

1. **Verify Node.js 20+**
   ```powershell
   node -v
   ```
   Install from https://nodejs.org if missing or below v20.

2. **Authenticate with Walrus Memory**
   Run from your home directory (`C:\Users\milan`):
   ```powershell
   npx -y @mysten-incubation/memwal-mcp login --prod
   ```
   Opens browser login flow. Saves credentials to `~/.memwal/credentials.json`.

3. **Add MCP server to Claude Code**
   ```powershell
   claude mcp add --scope user memwal -- npx -y @mysten-incubation/memwal-mcp
   ```

4. **Restart Claude Code** (fully quit and reopen)

5. **Verify** — ask Claude: "What MCP tools do you have available?"
   Expected: `memwal_remember`, `memwal_recall`, `memwal_analyze`, `memwal_restore`, `memwal_login`, `memwal_logout`

6. **Install Python SDK**
   ```powershell
   pip install memwal
   ```

7. **Set credentials as env vars** (never hardcode)
   ```powershell
   $env:MEMWAL_ACCOUNT_ID = "your-account-id"
   $env:MEMWAL_DELEGATE_KEY = "your-delegate-key"
   ```

### Day-3 Gate Script Target
`scripts/walrus_memory_gate.py` — store a memory, exit, recall it. See `scripts/` for implementation.

---

## Track 2 — Sui Move Environment

### What Needs Installing

| Tool | Install method | Verify command |
|------|---------------|----------------|
| Sui CLI | `cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet sui` OR pre-built binary from GitHub releases | `sui --version` |
| Rust toolchain | https://rustup.rs — required if building Sui from source | `rustc --version` |
| Move toolchain | Bundled with Sui CLI | `sui move build` |

For Windows the **pre-built binary** from the Sui GitHub releases page is the fastest path.
Download `sui-windows-x86_64.zip` from https://github.com/MystenLabs/sui/releases/latest,
extract, and add the folder to `PATH`.

### Day-7 Gate Package Target
`move/hello_walrus/` — a minimal Move package that compiles and tests clean.

---

## Walrus Foundation RFP Program

Source: https://walrus.xyz/rfp | https://blog.walrus.xyz/walrus-foundation-rfp-program/

### Program Overview
The Walrus Foundation runs a rolling RFP program funding projects that advance decentralised,
programmable storage. Applications are open until a suitable team is selected per RFP.
Review is on a rolling basis (begins ~2 weeks after each RFP opens). Payment is milestone-based.

### Focus Areas (active as of 2026-06-12)
- New tooling development for the Walrus ecosystem
- Protocol integrations (AI agents, dApps, data pipelines)
- Novel use cases for decentralised storage
- Infrastructure and developer experience improvements

**Individual active RFPs** are listed in the Airtable portal at walrus.xyz/rfp — check directly
for current open RFPs and titles (they rotate as teams are selected).

### How This Experiment Qualifies

| RFP Criterion | This Experiment |
|---------------|-----------------|
| Tooling development | Walrus Memory Python integration scripts |
| Protocol integration | memwal SDK + AI agent memory layer |
| AI agent use case | Portable memory across MilanGPT OS agents |
| Team commitment | Documented 7-day experiment with completion gates |
| Novel use case | Cross-session AI agent memory on decentralised storage |

### ARK Megatrend Alignment (using MilanGPT OS framework)

| Megatrend | Fit | Reason |
|-----------|-----|--------|
| AI Agents and Autonomous Systems | **Strong Fit** | Core use case — persistent memory for AI agents |
| Blockchain and Fintech Disruption | **Strong Fit** | Built on Sui, WAL token, decentralised storage |
| Digital Productivity and Knowledge Economy | **Partial Fit** | AI agent enhancement = knowledge worker productivity |
| Robotics and Physical Automation | Weak Fit | Not the primary use case |
| Energy and Sustainability Technology | Not Applicable | — |

**Overall conviction: High.** Two strong-fit megatrends = build signal.

### Application Process
1. Submit via Airtable form at walrus.xyz/rfp
2. Rolling review (2-week cycle)
3. Shortlisted teams: interview + technical assessment
4. KYC/KYB required before onboarding
5. Milestone-based payment on completion

**Action item:** After Day-3 gate passes, submit proposal to Walrus Foundation RFP program
with the working memory integration script as proof-of-concept.

---

## Grants Program (separate from RFPs)
Walrus also awards grants for smaller, well-scoped deliverables or MVP-level traction experiments.
Granted through community engagement (Discord, events, active building) rather than formal applications.
Eligibility: any individual building on Walrus. This experiment qualifies.

---

## File Structure

```
scripts/
  walrus_memory_gate.py    — Day-3 gate script (to be built)
move/
  hello_walrus/            — Day-7 gate Move package (to be built)
    Move.toml
    sources/
      hello.move
.env                       — NEVER commit (in .gitignore)
.gitignore
CLAUDE.md
```

---

## Environment

- **Python:** 3.x, PowerShell on Windows 11
- **Node.js:** 20+ required for memwal MCP
- **API keys:** Never hardcode — use environment variables
- **Git remote:** github.com/milan2307/exp-sui-walrus (private repo)
- **Parent repo:** MilanGPT OS at github.com/milan2307/MilanGPT-OS

---

## What Not To Do

- Do not commit `.env`, `credentials.json`, or any file containing private keys
- Do not hardcode `MEMWAL_DELEGATE_KEY`, `MEMWAL_ACCOUNT_ID`, or `ANTHROPIC_API_KEY`
- Do not mark a gate complete without the proof output (terminal log or script output)
- Do not build beyond the gate requirements for each day — validate before expanding
- Follow all MilanGPT OS operating rules (70/20/10, no half-finished implementations, etc.)
