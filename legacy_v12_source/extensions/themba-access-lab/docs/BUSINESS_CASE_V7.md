# Themba — business problem, product value and financial model

**13 November 2026 | Financial scenarios are not sales or forecasts.**

## The problem

South African stokvel groups save together to reach shared goals. They need transparent contribution histories, clear payout scheduling, appropriate independent approvals and accessible records. When records are fragmented across cash, spreadsheets and messaging channels, payment disputes, reconciliation delays and decision ambiguity can become harder to resolve. The sector already has credible financial providers; the opportunity is **operational coordination** and **rotating-payout risk visibility**, not claiming to replace a bank or eliminate all financial loss.

## Market evidence

- Ipsos (13 March 2024) describes an estimated **800,000+ groups, 11 million members and R50 billion** in the stokvel sector. These are older industry estimates, not Themba's addressable paying market. Cash remains important and WhatsApp use is increasing: https://www.ipsos.com/en-za/stokvels-remain-untapped-human-banks-south-africa
- Capitec offers an existing stokvel account with **no extra monthly fee**, contribution tracking, member transaction transparency and payouts controlled by main members: https://www.capitecbank.co.za/personal/save/stokvel-account/
- StokFella advertises Club R0/month, Gold R199/month and Platinum R599/month (check inclusions/limits; some features are marked coming soon): https://www.stokfella.com/pricing
- FinMark Trust (30 July 2026) reports household financial pressure and limited savings capacity. It does not establish willingness to pay for Themba: https://finmark.org.za/knowledge-hub/articles/media-release-finscope-consumer-south-africa-2025?entity=blog

## Product value and adoption

- **Members:** independently see verified vs reported contributions, next payout dates, rules, reserve balances and disputes without repeatedly contacting the treasurer.
- **Treasurers:** reconcile contribution records, see missing payments, export reports and reduce repetitive administrative work.
- **Committees:** distinguish approval from payment, track two independent non-recipient decisions, and understand the consequences of early payouts.
- **Low-data/basic-phone users:** same underlying records should be accessible via accessible web, USSD menus and eventually SMS/voice channels. Current USSD callback supports public *demo* menus only; no real personal data.
- **Group adoption:** keep existing bank accounts and practices initially. Begin as noncustodial record-keeping software; bank integration only with suitable partners and verified payment evidence.

## Practical go-to-market hypothesis

1. Recruit 15–30 existing groups for a consented pilot across rotating and grocery stokvels.
2. Import their member lists and contribution histories into a **reviewed private tenant**, not the public browser demo.
3. Measure treasurer hours saved, reconciliation errors, disputes, monthly active members, onboarding completion and usability across languages/devices.
4. Test paid conversion at pricing choices after the free pilot. Do not claim customer numbers, fraud reduction or savings until independently measured.
5. Provide an opt-in referral program through established group leaders; no spam SMS, public blacklist or collection of protected personal information without legal grounds.

## Revenue strategy

**Proposed, not validated:** Community Free; Plus **R99 per group/month**; Pro **R249 per group/month**; custom organizational contracts; optional paid onboarding and member-approved reporting services. Keep transparency, group funds and protection reserves separate from Themba revenue. Do not profit from members' reserve funds.

**Why would they pay when Capitec offers a free group account?** Only if Themba demonstrably saves administration time, provides bank-agnostic rotating-payout forecasting, a clearer multi-channel experience and useful committee governance. Feature benefits must be tested with real groups.

## Transparent illustrative profitability model

Inputs: 20% of active groups subscribe; 2/3 of subscribers choose R99 Plus and 1/3 choose R249 Pro (about R149 average per paying group); modelled direct servicing costs R20 per paid group/month and R3 per free group/month; overhead varies by scale. **None of these conversion, cost, CAC, retention or pricing assumptions is verified by Themba's customer data.**

| Scenario | Active groups | Paying groups | Monthly subscription revenue | Monthly servicing costs | Monthly fixed overhead | Monthly result | Annualized result at steady state |
|---|---:|---:|---:|---:|---:|---:|---:|
| Early | 500 | 100 | R14,850 | R3,200 | R30,000 | **−R18,350** | −R220,200 |
| Growing | 5,000 | 1,000 | R148,950 | R32,000 | R100,000 | **+R16,950** | +R203,400 |
| Scale | 20,000 | 4,000 | R595,950 | R128,000 | R350,000 | **+R117,950** | +R1,415,400 |

At 20% conversion and the assumed costs/prices, contribution margin per active group is approximately **R23.40/month**. To cover R100,000/month fixed overhead, breakeven occurs at approximately **4,274 active groups** (before tax and additional costs). This is an *arithmetic break-even*, not a guaranteed attainable adoption level.

Other major unmeasured costs: banking/payment gateway fees, SMS/USSD/IVR messages and minutes, legal/compliance, customer support, chargebacks, insurance/lending review, marketing and customer acquisition cost. Those can shift modeled profit into a loss. We should not charge customers for unnecessary USSD conversations.

### Revenue opportunity vs profit

If 1% of the estimated 800,000 groups adopted the platform (8,000 active groups), and 20% subscribed at an average R149/month, annual subscription **revenue** would be about **R2.86 million**, before all business expenses. It is neither projected profit nor an adoption forecast.

## Responsible financial product boundaries

- Members' funds belong to the groups; software subscription revenue is separate.
- Reserve is **not guaranteed insurance**. Defaults can exceed reserve holdings.
- Two payout approvers are **not personally liable guarantors** by default.
- Banks already have secure controls and banking access; don't falsely claim they are equivalent to a corrupt treasurer.
- Financial law/crypto custody/insurance and direct marketing need qualified South African advice. FSCA licensing overview: https://www.fsca.co.za/New-Financial-Service-Provider/; Information Regulator POPIA guidance: https://inforegulator.org.za/wp-content/uploads/2020/07/GUIDANCE-NOTE-ON-DIRECT-MARKETING-IN-TERMS-OF-THE-PROTECTION-OF-PERSONAL-INFORMATION-ACT-4-OF-2013-POPIA.pdf

## Current deliverable versus next release

The web demo and local Node/SQLite integration sandbox are **test environments**, not production. Real Supabase RLS, payment provider settlement, proof-of-on-chain execution, phone provisioning, professional translation, SASL video and legal review remain incomplete.
