# TradeProof — Project Scope

Author: Milan (milan@speedexlogistics.com)
Repo: https://github.com/milan2307/exp-sui-walrus
Date: 2026-06-17

---

## What Problem This Solves

Global trade finance runs on paper and SWIFT. Both are broken in the same way: they are slow, trust-dependent, and built around business hours. Shipping does not have business hours. A container leaves Mombasa at 2 AM on a Sunday. The SWIFT payment for that shipment settles on Wednesday morning, in business hours, after three correspondent banks have each taken a cut and a delay.

The Bill of Lading (BL) — the foundational document of all ocean trade — still exists as a physical paper in many corridors. A single BL fraud can cost millions. Customs authorities, shipping lines, ports, and banks each hold a separate copy of the same data, none of which talk to each other in real time.

The result: a $10 trillion/year industry runs reconciliation processes that would embarrass a 2005 startup.

---

## What Is Already Built (TradeProof v0.1)

**Deployed on Sui Testnet.**

A two-party trade proof contract where:
- The exporter (sender) creates a shipment proof object and marks goods dispatched
- The importer or bank (receiver) must independently sign to confirm delivery
- The Sui VM enforces the rule — the sender cannot confirm their own delivery
- The shipping document is stored on Walrus decentralised storage
- The SHA-256 hash of that document is stored on-chain
- Anyone can verify the document at any time: fetch from Walrus, hash it, compare to chain

```
Package:      0x0c18d6a33f794d9e265029a6f1d9ddbf42a44fbc3239737486a4aaaef2c70f1e
Live object:  0xc60b8192f9ccd6c5cbb59272d09062b361e14812f3cf9ba4f9b38093778d7c0d
Tests:        7/7 passing (including two-party rejection tests)
```

Explorer:
https://testnet.suivision.xyz/object/0xc60b8192f9ccd6c5cbb59272d09062b361e14812f3cf9ba4f9b38093778d7c0d

This is the foundation. The scope below is what it needs to become.

---

## Expanded Scope

### 1. Bill of Lading as an NFT / Digital ID on Sui

The Bill of Lading is the title document of ocean cargo. Whoever holds the BL owns the goods. Currently this is a paper document, or at best a PDF in an email thread.

**What we want to build:**
- The BL becomes a Sui NFT (`logioracle::bill_of_lading`)
- The BL object holds: vessel name, voyage number, port of loading, port of discharge, cargo description, shipper, consignee, notify party, number of originals issued
- Endorsement is on-chain transfer — instead of signing the back of a paper and mailing it, the holder signs a Sui transaction
- The document attached to the BL is stored on Walrus; the BL NFT holds the Walrus blob ID and SHA-256 hash
- The BL NFT can be used as collateral for Letters of Credit: the bank holds the NFT until payment is made, then transfers it to the buyer

**Why Walrus matters here:**
The BL references a Walrus-stored document. The NFT is the title; the Walrus blob is the evidence. Both are permanent, decentralised, and verifiable without trusting any one company.

**Why this is a real problem:**
The ICC (International Chamber of Commerce) and BIMCO have spent 20 years trying to digitise the BL through eBL platforms (essDOCS, Bolero, WaveBL). All of them require both parties to be registered on the same platform. A Sui NFT requires only a wallet.

---

### 2. Container Number as a Digital ID on Sui

Every shipping container has an ISO 6346 identifier (e.g. MSCU1234567). This number follows the container for its entire life — decades. Currently that ID lives in shipping line databases (Maersk, MSC), port terminal systems (NAVIS, Tideworks), and customs systems. None of these share data cleanly.

**What we want to build:**
- Container as a Sui object (`logioracle::container`)
- Fields: ISO container ID, size/type (20FT, 40HC, reefer), current operator, manufacturing date, inspection history
- Each shipment event (gate in, gate out, loaded, discharged, customs cleared) is a transaction on the container object
- The full history of a container is readable from the chain — no need to query five separate systems
- Walrus stores inspection photos and condition reports, referenced by the container object

**Why this matters:**
Container fraud (ghost containers, duplicate bookings, phantom shipments) costs the industry hundreds of millions per year. A container with an immutable on-chain history is much harder to fake.

---

### 3. Bring All Shipping Payments On-Chain

**The problem with SWIFT:**
- 3–5 business day settlement
- Works Monday–Friday, business hours, ignores time zones
- Each correspondent bank adds fees and delays
- No programmability — you cannot attach conditions to a payment

**What needs to go on-chain:**
- Freight payments (carrier to shipper, or shipper to carrier)
- Demurrage and detention charges (container held too long at port or customer premises)
- Customs duties and port handling charges
- Letter of Credit settlements

**What we want to build:**
- Escrow contract (`logioracle::payment`) linked to the BL NFT
- Buyer deposits funds into escrow at time of shipment
- Funds release automatically when `confirm_delivery` is signed by the receiver (the two-party proof already built in v0.1)
- No SWIFT, no correspondent banks, no business hours
- Demurrage calculated on-chain from actual container timestamps vs. agreed free time
- Customs duty payment submitted directly to the authority's Sui address

**Settlement speed comparison:**
| Method | Settlement time | Available |
|---|---|---|
| SWIFT MT103 | 3–5 business days | Mon–Fri only |
| SEPA Instant | Hours | 24/7 but EU only |
| On-chain (Sui) | ~2 seconds | 24/7/365 |

A vessel does not care what day it is. A Sui transaction does not either.

---

## The Hardest Part: Getting Shipping Lines and Governments On-Chain

Everything above is technically buildable. The actual blocker is institutional adoption.

**Who needs to be on-chain for this to work:**
- Shipping lines (Maersk, MSC, CMA CGM, Evergreen, COSCO — the top 5 control ~65% of global capacity)
- Port terminal operators (DP World, PSA International, APM Terminals, Mombasa Port, Port of London Authority)
- Customs authorities (HMRC, Kenya Revenue Authority, US CBP, EU customs)
- Central banks and regulators (for on-chain settlement to be legally valid payment)
- Banks issuing Letters of Credit (Standard Bank, Standard Chartered, Citibank trade finance desks)

**Why this is hard:**
- Shipping lines have invested hundreds of millions in existing systems
- Customs authorities require legislative change to accept blockchain records as legal tender
- Banks are regulated and move slowly
- There is no single decision-maker — it requires a coalition

**The strategy that works in other industries:**
The approach that has worked elsewhere (e.g. DeFi eating into traditional finance, stablecoins replacing wire transfers in corridors like US–Mexico) is:
1. Start with the parties who have the most pain and least to lose
2. Build the standard, then invite others to implement it
3. Get one large player to adopt it, which forces competitors to follow

**For TradeProof, the entry point is freight forwarders and SME exporters** — they have the most pain, no existing investment to protect, and are often excluded from trade finance because they are too small for banks to serve. Once the proof layer exists, they can use it to access finance they currently cannot get.

---

## What We Are Asking the Sui/Walrus Team

1. **Technical guidance:** Is the shared object + two-party signing pattern the right Move architecture for multi-party trade documents, or is there a better pattern (e.g. capability objects, kiosk)?

2. **Walrus CLI config:** We need `client_config.yaml` for testnet to use the Walrus CLI. Currently using the HTTP publisher API as a workaround. Where do we get the official testnet config?

3. **RFP alignment:** Does this project fit the Walrus Foundation RFP program? The scope is Real World Assets (trade documents) + on-chain payments + decentralised storage for evidence. We have a working v0.1 on testnet and a clear roadmap.

4. **Ecosystem connections:** Are any shipping lines, port operators, or trade finance banks already building on Sui/Walrus? We would rather join an existing coalition than start one from scratch.

5. **Regulatory path:** Has Mysten Labs or the Walrus Foundation engaged with any customs or trade finance regulators? Legal acceptance of on-chain records as valid trade documents is the long-term unlock.

---

## Summary

TradeProof v0.1 proves the technical foundation: two parties, two signatures, one immutable proof on Sui, document evidence on Walrus. The expanded scope is a full trade finance operating system that replaces paper BLs, container data silos, and SWIFT payments with on-chain equivalents that work at 2 AM on a Sunday, because shipping does not sleep.

The hardest part is not the technology. It is getting one large shipping line and one customs authority to say yes. That is a business and policy problem, not a code problem. But the code needs to exist and be credible before anyone says yes.

This is what we are building.
