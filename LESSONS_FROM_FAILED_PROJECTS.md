# Lessons from Failed Blockchain Trade Finance Projects

Research date: 2026-06-17
Author: Strategic research for TradeProof / logioracle on Sui + Walrus

---

## Executive Summary

Between 2018 and 2023, five major blockchain trade finance projects attracted billions in institutional backing and collapsed anyway. The technology worked in every case. The adoption didn't. This document is a forensic post-mortem of four of those failures — TradeLens, we.trade, Contour, and Marco Polo — and a clear-eyed analysis of what that means for TradeProof on Sui + Walrus, and what to do differently.

The one-sentence answer: **they built platforms when the industry needed a protocol.**

---

## 1. TradeLens (Maersk + IBM) — Shut Down December 2022

### What They Built
A blockchain-based global shipping visibility platform on Hyperledger Fabric. Digitised shipping documents, container events, customs filings, and port operations. Covered the entire ocean container supply chain from origin to destination.

### Partners and Scale
- Co-built by A.P. Møller-Maersk and IBM
- At peak: 5 of the world's 6 largest ocean carriers onboarded
- Over 50% of all ocean container cargo reportedly on the platform
- 175+ ports, terminals, and inland depots connected
- Launched 2018, shut down Q1 2023

### Stated Reason for Shutdown
"The need for full global industry collaboration had not been achieved. TradeLens had not reached the level of commercial viability necessary to continue as an independent business." — Maersk press release, November 2022

### Real Reasons

**Governance failure — the SWIFT problem.** SWIFT succeeded in banking because it is owned by no single bank. TradeLens was co-owned and operationally led by Maersk, one of the world's largest shipping lines. MSC, CMA CGM, Evergreen, and other major carriers were asked to share sensitive operational data on a platform controlled by their direct competitor. They refused. Without broad carrier participation, the network effect never materialized.

**The competitor trust problem is fatal.** A shipping line sharing its operational data with Maersk is the equivalent of a bank sharing its customer data with its largest competitor. The technical solution was irrelevant once that structural reality became clear.

**Hapag-Lloyd and CMA CGM explicitly said** that any industry-wide platform would require neutral governance rules. That restructuring never happened.

### What They Got Right
- The technical platform was functional and robust
- The data model for container tracking was solid
- They proved the integration was possible — ports, customs, carriers could all connect

### What They Got Wrong
- Built a platform controlled by one industry competitor
- Tried to get 100% of the industry before proving value to any specific segment
- Confused data sharing (what everyone is afraid of) with process digitisation (what everyone needs)

---

## 2. we.trade — Closed Mid-2022

### What They Built
A bank-backed blockchain platform for domestic and intra-EU trade finance — specifically open account trade, bank payment obligations, and working capital financing for SME exporters. Built on Hyperledger Fabric via IBM.

### Partners and Scale
- Joint venture of 12 European banks + IBM
- Shareholders: CaixaBank, Deutsche Bank, Erste Group, HSBC, KBC, Nordea, Rabobank, Santander, Société Générale, UBS, UniCredit, and others
- Raised €5.5m in a 2021 funding round (their last)
- Had to slash workforce by ~50% in 2020 after bank funding fell short
- Never disclosed transaction volumes publicly

### Stated Reason for Shutdown
"The company was unable to reach an agreement with its joint venture shareholders on the financing of further investments." — GTR, June 2022

### Real Reasons

**No revenue model.** Twelve banks jointly owned a platform but none were its commercial champion. The structure meant every major decision required consensus from 12 competing institutions. No single investor was motivated to lead funding rounds or drive aggressive sales. The result: years of operating losses with no path to profitability.

**IBM was both shareholder and vendor.** IBM owned equity in we.trade while also being paid to build and run the technology. This created a structural conflict: IBM's commercial interests (extracting technology revenue) worked against the consortium's interests (reducing costs to achieve market adoption). Technology maintenance costs stayed high. The business model never closed.

**SME trade finance is the hardest segment.** SMEs have the most to gain from trade finance digitisation but the least capacity to change their systems and processes. Selling to SMEs requires either direct sales (expensive) or bank distribution (slow). we.trade relied on banks to push SME customers onto the platform. Banks didn't prioritize it.

**Vendor lock-in killed unit economics.** Being on a novel blockchain architecture meant that any infrastructure change was expensive and slow. The platform was burning cash on maintenance before it ever reached scale.

### What They Got Right
- The use case (SME trade finance access) is real and valuable
- Bank consortium model could have worked with different governance

### What They Got Wrong
- No lead investor = no one accountable for commercial success
- Revenue sharing model never resolved between competing bank shareholders
- Chose the hardest customer segment (SMEs) and the slowest distribution channel (banks)

---

## 3. Contour (formerly Voltron) — Shut Down November 30, 2023

### What They Built
A blockchain network for digitising Letters of Credit on R3 Corda. Letters of Credit are the most important payment instrument in international trade: the bank guarantees payment to the seller if the correct documents are presented. Contour reduced LC processing time from 5–10 business days to under 24 hours in pilots.

### Partners and Scale
- Founded by HSBC, ING, Standard Chartered, Citi, BNP Paribas, SEB, Bangkok Bank, and others
- Backed by R3 (the enterprise blockchain consortium)
- Went live in production December 2020
- At shutdown: processing only **60–70 transactions per month**
- Bank shareholders included most of the world's largest trade finance banks

### Stated Reason for Shutdown
"Having a large group of investors without a lead investor makes it hard. It would be the lead investor who would manage the board and manage the round, and we've never had that." — Carl Wegner, CEO of Contour, November 2023

### Real Reasons

**60–70 transactions per month is not a business.** At that volume, Contour could not sustain its operational costs regardless of how technically capable the platform was. Each bank had to build internal integrations to connect to Contour. The ROI math didn't work: a bank spent millions integrating their trade finance back-office system to Contour, and then processed dozens of transactions per month. The investment was never justified.

**Banks did the integration math and lost.** The industry knew LCs processed in under 24 hours instead of 10 days was valuable. But "our bank specifically" processing 70 Contour LCs per month out of millions of total LC transactions does not justify the integration cost. The benefit was diffuse; the cost was immediate.

**No lead investor = no accountability.** Same governance failure as we.trade. When the company needed bridge funding to reach scale, there was no single investor with sufficient stake and conviction to lead the round. Each bank was unwilling to put more money in unless others did. Classic coordination failure.

**The network effect never fired.** LCs require a buyer's bank AND a seller's bank. If either bank is not on Contour, the transaction cannot happen on Contour. Getting both banks on the platform simultaneously, for a specific trade, at scale, never happened consistently enough.

### Postscript: XDC Network Acquired Contour (October 2025)
After shutting down in November 2023, Contour's assets were acquired by XDC Network in October 2025. XDC is restructuring it with stablecoin integration and fresh capital. This is significant: the platform had value, just not the governance or revenue model to sustain it independently.

### What They Got Right
- The technical result was real: 90%+ reduction in LC processing time
- The use case (LC digitisation) is genuinely one of the highest-value problems in trade finance
- Multi-bank consortium showed the technology works across institutions

### What They Got Wrong
- Volume at shutdown was economically unviable — they ran out of runway before network effects kicked in
- No single institution took ownership of driving adoption
- Required both buyer's bank and seller's bank to be on-platform simultaneously — double cold start problem

---

## 4. Marco Polo Network — Insolvency February 2023

### What They Built
An open trade finance and supply chain finance network on R3 Corda, focused on receivables finance, payables finance, and bank payment undertakings. Designed to connect banks with corporates across the full working capital lifecycle.

### Partners and Scale
- 30+ major bank members including Commerzbank, BNY Mellon, SMBC, ING, Standard Chartered
- Backed by R3 and TradeIX
- €5.2m in total debt at insolvency
- €2.5m negative net assets
- Declared insolvent by Irish court, February 22, 2023

### Stated Reason for Shutdown
Marco Polo failed to secure a last-minute €12m investment from Bank of America. BofA pulled out in late January 2023 — reportedly after TradeLens' shutdown in late 2022 made them reconsider blockchain trade finance investments generally.

### Real Reasons

**Momentum collapse from a single deal failure.** The BofA deal failing was the proximate cause, but the underlying cause was that Marco Polo had been running for years without reaching production scale. They missed their targeted go-live of early 2019. They missed a revised go-live of Q2 2020. By the time they were operationally ready, the market's confidence in blockchain trade finance platforms was evaporating — accelerated by TradeLens and we.trade shutting down in 2022.

**Timeline slippage killed investor confidence.** In enterprise technology, missing production dates is a trust killer. Marco Polo missed two major production milestones. When they needed a final bridge to reach scale, investors had seen the pattern of failure across the industry and were no longer willing to bet.

**The dominoes effect.** TradeLens (late 2022) → we.trade (mid-2022) → Marco Polo lost BofA (January 2023) → Marco Polo insolvency (February 2023) → Contour shutdown (November 2023). Each failure made the next one more likely by reducing investor and bank appetite for the entire category.

### What They Got Right
- Strong bank membership roster — 30+ major institutions shows the concept had industry interest
- Working capital financing use case (receivables, payables) has more potential than LC-only approaches

### What They Got Wrong
- Missed production timelines destroyed credibility with the institutional investors they needed
- By the time the platform was functional, the broader market had lost confidence
- Depended on a single large investor (BofA) as a lifeline — single point of failure

---

## 5. Cross-Project Failure Patterns

### Pattern 1: Platform, Not Protocol
Every single one of these projects built a **walled garden**. To use TradeLens, you had to be on TradeLens. To use Contour, your counterparty's bank also had to be on Contour. None were interoperable with each other. The result: the industry had five competing "standards," each with too little volume to sustain itself.

The analogy: imagine if SWIFT required all banks to use the same email client. Instead, SWIFT is a messaging standard — banks use it with any system. That's why SWIFT works.

Timothy Ruff (digital trust researcher) put it precisely: *"The problem is structural — these platforms competed with each other rather than creating interoperable infrastructure. What's needed are protocols for the secure peer-to-peer exchange of verifiable trade instruments, not platforms that require all participants to join the same network."*

### Pattern 2: Governance Without Accountability
Every consortium had multiple equal shareholders and no lead investor. This produces:
- Decision-making by committee (slow)
- No single party accountable for commercial outcomes
- Funding rounds require unanimous agreement from competitors
- When a bridge is needed, everyone waits for someone else to go first

### Pattern 3: The Cold Start Problem Was Doubled or Tripled
A single platform's cold start problem: users don't join until there are other users; there are no other users until users join.

For trade finance, this is doubled: both the buyer's bank AND the seller's bank have to be on the same platform for any single transaction to work. And in many cases, tripled: the shipping line or freight forwarder also needs to be connected.

### Pattern 4: Enterprise Integration Cost vs. Transaction Volume
Every bank that joined had to build internal systems to connect to the platform. That integration costs millions. To justify that cost, the bank needs to process a meaningful fraction of its trade finance volume on the platform. None of these platforms ever reached that fraction.

The math is brutal: if a bank spends €2m integrating and then processes €500k of trade finance on the platform per year, it will never recoup the investment.

### Pattern 5: Lost Credibility Cascade
The failures reinforced each other. Every shutdown made remaining platforms' investors more nervous. BofA's withdrawal from Marco Polo was directly attributed to watching TradeLens close. Contour's bank shareholders also cited the market environment in pulling funding. Once the narrative became "blockchain trade finance doesn't work," each individual project's execution problems became self-fulfilling prophecies.

### Pattern 6: Technology-First, Market-Second
All four built the technology platform first, then tried to convince an industry to change its behaviour. None started with a specific, painful, well-defined problem that a specific set of users was desperate to solve right now.

---

## 6. What Survived — And Why

### Komgo (the only blockchain trade finance platform still operating at scale)
- **What it does:** Commodity trade finance — oil, metals, agricultural commodities
- **Scale as of 2025:** 10,000+ corporate users, 60+ banks
- **Why it survived:**
  1. **Specific niche.** Commodity trade has a specific set of parties (commodity traders, commodity banks) with specific high-pain documents (borrowing bases, collateral management). Komgo solved a defined problem for a defined community.
  2. **Neutral governance.** Not owned by any single commodity trader or bank competitor.
  3. **Revenue through acquisition.** Acquired GTC to consolidate and build a unified platform (GTK — Global TradeKonnect), expanding total addressable market.
  4. **Pragmatic on blockchain.** Komgo used DLT where it added value (secure document exchange, audit trail) but didn't insist on full decentralisation. Pragmatism over ideology.

### DCSA Electronic Bill of Lading Standard
- **What it is:** Not a platform — a data exchange standard for eBLs
- **Milestone:** In May 2025, DCSA completed the first **interoperable** eBL transaction between two different eBL platforms (CargoX and EdoxOnline)
- **Why it's working:** It's a protocol. Anyone can implement it. Platforms compete on features; the standard ensures interoperability.
- **Status as of January 2025:** 5.7% eBL adoption globally — still low, but legal frameworks (MLETR in 19 countries) and DCSA standard mean the infrastructure now exists

### WaveBL
- Blockchain eBL platform
- U.S. Bank became first American bank to execute a transaction on WaveBL in early 2026
- Focusing on specific corridor adoption rather than boiling the ocean

### XDC Network (acquired Contour, October 2025)
- After Contour's shutdown, XDC acquired the assets and is restructuring with stablecoin integration
- Signals that the LC digitisation use case has value — the platform model failed, not the idea

---

## 7. What This Means for TradeProof on Sui + Walrus

### The Good News
TradeProof has several structural advantages the failed projects did not:
1. **Open source from day one.** No governance conflict. No consortium to manage. Anyone can use the contracts.
2. **No integration cost.** A Sui wallet is the integration. Not a million-dollar systems integration project.
3. **Sui's object model makes the BL NFT genuinely novel.** The holder-enforces-rights pattern (only the object owner can endorse) is something Hyperledger Fabric and Corda cannot do elegantly. This is a real technical differentiator.
4. **Walrus as the storage layer.** Evidence stored on Walrus + hash on Sui = independently verifiable without trusting any single company. None of the failed projects had this.
5. **Milan has direct domain expertise.** He is not a technologist who learned trade finance from papers. He is a logistics professional who learned blockchain. That's rare and valuable.

### The Risk
TradeProof currently has the same structural risk as every failed project: **it is a platform, not a protocol.** Right now, it is a set of contracts that work together in one ecosystem. If we add a UI, onboard users, and charge fees, we become the same model that failed four times.

The question is not whether the technology is good. It is. The question is: **what is the adoption path that avoids the network effect problem?**

### The Alignment Opportunity with Sui/Walrus
- Walrus raised $140m (Standard Crypto, a16z, Electric Capital, Franklin Templeton Digital Assets) specifically for real-world asset use cases
- Plume Network is building RWA tokenization on Sui using Walrus as default storage — potential collaboration
- Mysten Labs has no known existing trade finance vertical focus — this is an opportunity, not competition
- Sui's zkLogin (sign in with Google/social, no wallet needed) solves the "my shipping line won't set up a crypto wallet" adoption problem
- The RWA market hit $24B by June 2025 — the institutional appetite is real

---

## 8. Recommended Strategic Pivots

### Pivot 1: Be a Protocol, Not a Platform
The DCSA approach won. Build an open standard, not a proprietary network.

**Concrete action:** Publish the Move contracts as an open standard. Any company, bank, or developer can deploy their own instance. TradeProof is the reference implementation and the standard, not a service you have to subscribe to.

This means:
- No "join our network" pitch
- Interoperability is built in from day one
- Shipping lines can deploy their own instance of the BL NFT standard
- The standard becomes valuable when it gets adopted; we don't need to own the platform to benefit

### Pivot 2: Align with DCSA eBL 3.0
The DCSA eBL 3.0 standard has 190+ defined data attributes and was specifically designed to be interoperable across platforms. If TradeProof's BL NFT maps to DCSA eBL 3.0 fields, shipping lines can integrate without having to trust a proprietary standard.

**Concrete action:** Map `logioracle::bill_of_lading` fields to DCSA eBL 3.0 specification. This turns the BL NFT from "Milan's blockchain BL" into "a DCSA-compliant BL on Sui."

### Pivot 3: Own One Problem Before Touching Another
Every failed project tried to solve all of trade finance. Komgo survived by solving commodity trade finance specifically.

**The sharpest single problem TradeProof can own:** Demurrage dispute resolution.

Why:
- $20–30 billion per year in disputed charges across the shipping industry
- Two parties only: shipping line and shipper. No government, no regulator, no third bank.
- `container::calculate_demurrage()` is already built — it's a deterministic on-chain function
- The switching cost is near zero: both parties are already tracking container events; they just do it in separate databases
- The value is immediate and calculable before any transaction: "if you avoid one dispute per month, you save $X"
- Kenya/EAC corridor is under-served and Milan has relationships to pilot this

### Pivot 4: Target the EAC Corridor First, Not the World
The failed projects all tried global from day one. Komgo started with a specific commodity community.

**The EAC corridor (Mombasa → Nairobi → Kampala → Kigali → Bujumbura)** is:
- High volume of container movement, significant demurrage and detention disputes
- Underserved by existing digital platforms
- Milan has direct relationships with freight forwarders, shipping agents, and potentially shipping lines
- Kenya Railways (SGR) and Kenya Ports Authority are potential institutional partners at a sovereign level that is more achievable than Maersk or MSC

Get 3 freight forwarders and 1 shipping line agency in Mombasa to run a real demurrage dispute on-chain. That is worth more than 100 shipping line conversations at conferences.

### Pivot 5: Leverage Sui's Unique Properties as the Story
The failed projects were selling "blockchain." Blockchain is not a feature users care about.

The story to tell:
- "The holder of this BL is always the owner. No one can forge a transfer because the Sui network verifies it in 2 seconds."
- "Demurrage is calculated from timestamps that no one can edit. Both parties agreed upfront. The dispute is resolved before it starts."
- "Your bank can see this document right now, from anywhere, without you emailing a PDF. The document is on Walrus; the proof it hasn't been altered is on Sui."

This is a product story, not a technology story.

### Pivot 6: Don't Build a Consortium — Build a Standard They Want to Adopt
The consortium model failed every time. Instead:
- Keep the contracts open source
- Publish clear documentation so any developer can implement
- Make the first implementation (TradeProof) the reference
- Engage DCSA, BIMCO, and EAC Secretariat to recognize the standard

A standard that shipping lines can implement independently is worth 100x more than a consortium they have to join.

### Pivot 7: Engage XDC Network / Contour
XDC acquired Contour in October 2025 and is rebuilding it with stablecoin integration. XDC and Sui are not the same chain, but the use case (LC digitisation) is one we have scoped. Rather than competing, this could be:
- A partnership: TradeProof handles the document layer, XDC/Contour handles the LC payment layer
- An interoperability story: DCSA-compliant documents work across any chain

---

## 9. The Decision Framework

Before writing another module, ask these three questions:

**1. Which specific set of users has this specific pain right now?**
Not "the shipping industry" — too broad. "Freight forwarders in Kenya who dispute demurrage charges with shipping lines every month" is specific enough to build for.

**2. Can one party adopt this without asking their counterparty to change their behaviour?**
Every failed project required both sides to change simultaneously. The demurrage calculator works if the shipping line adopts it and the shipper verifies the result. The shipper doesn't have to be on Sui to see the result; they just need a browser.

**3. Does adopting this create a switching cost for the adopter, or for their competitors?**
The ideal: once a freight forwarder uses TradeProof for one demurrage case, they want to use it for all of them. The switching cost should lock users in, not lock them out.

---

## 10. The Immediate Next Steps (in order)

1. **Wait for the Sui/Walrus Discord response.** Ask specifically: "Are any other projects building in trade finance or logistics on Sui? We don't want to duplicate." If the answer is yes, collaborate. If no, you have a clear lane.

2. **Contact DCSA** (digital-standards@dcsa.org or via dcsa.org) and ask whether a Sui-based implementation of eBL 3.0 would be eligible for their interoperability program. This could put TradeProof on the DCSA-recognized platform list alongside CargoX and EdoxOnline — instant credibility with shipping lines.

3. **Find one freight forwarder in Mombasa** willing to run a real demurrage dispute through the container module. Milan knows these people. One real case is the entire pitch.

4. **Don't add more Move modules.** The 9 modules already built exceed what any of the failed platforms shipped before they started pitching. The codebase is not the bottleneck. Real-world adoption is the bottleneck.

5. **Prepare a 1-page brief for the Sui/Walrus team** that covers: what's built, what specific problem it solves (demurrage), what specific users (EAC corridor freight forwarders), why Sui/Walrus uniquely enables this (object ownership for BL, Walrus for evidence, zkLogin for adoption), and what you need from them (introductions to DCSA, funding for a pilot, co-marketing as a reference RWA project).

---

## Sources Consulted

- [Maersk TradeLens Shutdown Announcement](https://www.maersk.com/news/articles/2022/11/29/maersk-and-ibm-to-discontinue-tradelens)
- [The Register: IBM, Maersk Shut Down TradeLens](https://www.theregister.com/2022/11/30/ibm_and_maersk_tradelens_shutdown/)
- [Supply Chain Dive: Maersk IBM TradeLens](https://www.supplychaindive.com/news/Maersk-IBM-shut-down-TradeLens/637580/)
- [HEALE Labs Case Study: Why TradeLens Failed](https://healelabs.com/case-study-why-maersks-and-ibms-tradelens-failed-and-why-heale-network-will-succeed/)
- [Frontiers in Blockchain: TradeLens Failure Analysis](https://www.frontiersin.org/journals/blockchain/articles/10.3389/fbloc.2025.1503595/full)
- [GTR: we.trade Calls It Quits](https://www.gtreview.com/news/top-stories/we-trade-calls-it-quits-after-running-out-of-cash/)
- [Ledger Insights: Contour to Shutter](https://www.ledgerinsights.com/contour-blockchain-trade-finance-network-shutter/)
- [GTR: Contour Shutdown Exclusive](https://www.gtreview.com/news/top-stories/exclusive-contour-to-shut-down-as-bank-shareholders-pull-funding/)
- [CoinDesk: XDC Acquires Contour](https://www.coindesk.com/business/2025/10/22/xdc-network-acquires-contour-to-expand-stablecoins-and-tokenization-in-trade-finance)
- [Ledger Insights: Marco Polo Insolvency](https://www.ledgerinsights.com/marco-polo-blockchain-trade-finance-insolvency/)
- [GTR: Marco Polo Liquidators](https://www.gtreview.com/news/top-stories/marco-polo-brings-in-liquidators-as-funds-run-dry/)
- [Trade Finance Global: Marco Polo Insolvency](https://www.tradefinanceglobal.com/posts/marco-polo-network-runs-insolvent/)
- [Timothy Ruff: Five Failed Blockchains](https://rufftimo.medium.com/five-failed-blockchains-why-trade-needs-protocols-not-platforms-d12a77386690)
- [DCSA eBL Interoperability Milestone](https://dcsa.org/newsroom/ebl-interoperability-milestone)
- [Komgo 2025](https://www.komgo.io/newsroom/komgo-2025-whats-new-and-what-you-need-to-know)
- [Plume + Mysten Labs RWA](https://blog.walrus.xyz/plume-mysten-labs-real-world-asset-tokenization-rwa/)
- [Blockchain in Trade Finance 2025 Update](https://iclg.com/practice-areas/lending-and-secured-finance-laws-and-regulations/11-trade-finance-on-the-blockchain-2025-update)
- [Trade Finance Global: Digital Trade Finance Landscape](https://www.tradefinanceglobal.com/blockchain/)
- [Espeo: Blockchain in Trade Finance 2026](https://espeo.eu/content/blockchain-trade-finance-what-changed-what-works/)
