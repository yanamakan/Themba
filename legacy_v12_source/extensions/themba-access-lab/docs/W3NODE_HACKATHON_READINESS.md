# THEMBA — W3Node Node Engine 2026: hackathon readiness and demo handoff

Updated **13 November 2026**. Review based on official public material and Themba V7/V8 local source. This is a checklist, not an endorsement or official acceptance.

## Sources verified

- **Organizer tracks and selection criteria:** https://w3node.io/node-engine — Real Solutions, Builder Mindset, Technical Proficiency. Six tracks: Cross-Border & Remittance, Mobile Money & Peer-to-Peer, Merchant & Machine Payments, Security, Real-World Assets, Agentic Finance.
- **Organizer event details:** https://w3node.io/ — November 12–14, 2026, Parkview Event Space, 5 Armadale Street, Woodstock, Cape Town. Apply-to-hack option is shown.
- **BuilderBase participation/submission terms:** https://builderbase.com/terms/ — organizers define their own submission requirements and deadlines.
- **The W3Node 2026 Eventbrite link `1469405273729` is for the January 22–24 edition**, not November. November listing: https://www.eventbrite.com/e/w3node-nov-2026-tickets-1996784195280

The **actual event-specific submission fields, exact deadline, team eligibility, prizes/sponsor quests and final judging weights** could not be independently verified from the public pages. The registered team must inspect its active BuilderBase event page and sponsor/mentor announcements. Do **not** borrow criteria from an unrelated hackathon.

## Recommended track strategy

1. **Primary: Mobile Money & Peer-to-Peer.** Clear connection to community contributions, rotating payouts and low-data/USSD access. Caution: a simulated transfer is not stablecoin settlement.
2. **Secondary: Security.** Two independent, non-recipient approvals, auditability, separate reserve, duplicate prevention, signer authorization. Caution: local rules are not on-chain enforcement.
3. **Real-World Assets** ONLY if required by the team's actual track assignment or if implementing a genuine on-chain representation of a defined asset/claim and demonstrating lawful custody and settlement. Putting an audit hash on-chain is not sufficient on its own.

## The one-sentence idea

**Themba helps community savings circles run fairer, easier-to-audit rotating savings and shared payouts through familiar phones, while cryptographic approval policies can protect optional on-chain testnet funds.**

## User experience: no crypto lesson required

A typical member sees: Join group → Check next contribution → Verify payment status → Know upcoming payout → See independent approvers and potential risk → Receive truthful confirmation.

**Bank-linked path (first real-world concept):** members continue using ordinary bank channels. An appropriately authorized payment provider verifies payment settlement; Themba reconciles that evidence with each group's ledger. Blockchain may anchor a verifiable record, **but cannot control funds held at the bank**.

**Optional blockchain testnet path (hackathon proof):** Sepolia token values are fictional. A properly deployed group escrow/policy module enforces member eligibility, two distinct non-recipient signer approvals, destination and amount, adequate available rotation funds, protected reserve, duplicate/payout ID checks and replay protection. An explorer verifies the resulting transaction. When a smart wallet or relayer abstracts gas and keys, **the user must still understand who controls funds, grant informed authorization, and have strong account recovery**. Do not store private keys on the site.

**Basic-phone users:** USSD and SMS safely provide language selection, non-sensitive status, contribution reminders and request initiation. Sensitive identity changes and actual payout approval require strong, verified identity and an authorized signer/custody method. A basic phone keypad response must **not** be treated as an Ethereum signature. For a real scheme, obtain a licensed custody/payment provider and legal review.

## What is currently demonstrated

| Capability | Evidence | State |
| --- | --- | --- |
| Independent approval rules | Browser demonstration and local SQLite backend tests | Tested locally, **not on-chain** |
| Two separated accounting pots | Browser simulation + local SQLite sandbox | Tested locally, no real custody |
| Rotating schedule and default risk display | Browser simulation | Demonstration |
| Simple phones/languages | USSD `CON/END` callback, SMS preview, WhatsApp/IVR simulations, 11 spoken languages + SASL visual option | Simulated; translations not reviewed |
| Brand and photographs | Existing Themba design language, user-supplied savings and rand photos | Demonstration |
| API privacy | Unauthenticated gateway avoids fixed personal balances | Tested locally |
| Integrated GitHub application | `yanamakan/Themba` main (now with Yana work) | **Not integrated with this prototype** |
| Astra contract proof | No deployed independently enforced no-self-approval policy verified | **Missing evidence** |
| Real money, SMS and bank reconciliation | No live providers connected | **Not implemented** |
| Accessible SASL content | Visual fallback only; no interpreted videos | Partial |

## Critical pass/fail tests for the team before submission

1. **Source ownership / eligibility:** confirm correct team, approved hackathon application, active track, repo requirements, project submission links and time deadline on BuilderBase.
2. **Real testnet deployment:** provide contract address, chain ID, ABI/source, verification link, reproducible deployment steps and signer addresses with no secret keys in Git. Do not claim a deployment without a verified transaction.
3. **On-chain invalid attempt:** demonstrate a requester attempting their own approval and a **contract-level rejection**; also test repeated signer, wrong group, duplicate payout and insufficient rotation funds. A UI error alone is insufficient proof.
4. **On-chain valid payout:** two distinct eligible non-recipient signers authorize a payout and a Sepolia transaction executes; show explorer transaction/receipt, events and relevant contract policy.
5. **No reserve theft:** demonstrate rotation pot funds can be paid only under policy while reserve funds remain locked for their agreed purpose; no arbitrary administrator withdrawal.
6. **Cross-layer reconciliation:** on-chain successful, failed/reverted and pending transactions have distinct states in the database and front-end; never mark a transfer complete on a UI click.
7. **Basic-phone demo:** Africa's Talking sandbox request reaches live callback, returns correct `CON/END` prompts and language flow, without revealing financial details for an unverified number.
8. **Accessibility:** native speakers review financial prompts; test non-smartphone usability and basic readable controls. SASL videos are not finished.
9. **Pitch and evidence:** supply source repository, concise setup, test outputs, 2-minute video (if required), five-minute demonstration and user research. Confirm precise organizer formats, do not assume a video is mandatory.

## Suggested 5-minute demo

- **0:00–0:40 Problem**: community saving already works; trust and reconciliation are harder when records and payout decisions are fragmented.
- **0:40–1:20 Accessible member experience**: choose a language and USSD screen, check an illustrative status; explain phone users don't need a crypto wallet for the bank-linked pathway.
- **1:20–2:10 Contributions and risk**: create custom group, add simulated contributions, show rotation versus reserve and potential future shortfall.
- **2:10–3:10 Governance**: show attempted requester self-approval rejected; switch two eligible independent signers and approve. Explicitly identify browser/SQLite behavior as a **simulation**.
- **3:10–4:00 Blockchain proof**: show a real **verified Sepolia transaction + deployed contract policy** only if available. If unavailable, label missing instead of presenting an explorer URL as proof.
- **4:00–5:00 Business model, feasibility, and next steps**: explain free records, paid advanced group reporting/risk tools; bank/provider integration and production compliance are future tasks.

## Recommended pitch

> Themba is a community-savings control layer. A grandmother using a basic phone sees a familiar numbered menu; a treasurer sees verified contribution records; members know the rotation schedule and their group's exposure; and no one can quietly authorize their own payout. For groups choosing blockchain custody, independent members must approve under a testnet policy that the network—not just the interface—enforces. Everyday members don't have to buy tokens, manage gas, or learn wallets. The money flow and the risk are still explained clearly. We are demonstrating an accessible testnet prototype, not a licensed bank or insurance company.

If the contract has not been independently tested and deployed, replace **"must approve under a testnet policy"** with **"our next step is to enforce that policy on-chain"** in a live pitch.

## Product and governance cautions

- Approvers are NOT automatically legally liable guarantors.
- A limited Protection Reserve is NOT guaranteed insurance and may be insufficient.
- No permanent public payment-default blacklists.
- Avoid storing personal group member details, sensitive contacts or bank information on a public blockchain.
- Publicly deployed browser demonstration must never include service-role keys, private wallets, or production payment credentials.
- Public demo links protected by temporary share tokens expire. Make sure the submission platform can open the link when judged.

## Source code and integration boundaries

No GitHub branch was modified by this work. V7 + a judge-mode-only UI extension is packaged separately under `extensions/themba-access-lab/`. See `TEAM_HANDOFF_V7.md`. Integrate only by reviewable PR after comparing current backend migrations/auth and Astra's deployed payout enforcement. Do not blindly merge implementation files or call local SQLite logic production-secure.
