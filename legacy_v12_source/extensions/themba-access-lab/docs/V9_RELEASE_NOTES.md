# Themba V9 team-review release — 13 November 2026

## What this release actually is
An isolated, browser-local **simulation** of selected Themba flows. It is **not** the GitHub team's complete website, their authenticated Supabase service, a bank, a deployed approval contract, or a live USSD/SMS service. No real money or crypto is handled. This release preserves the original Themba visual palette and member-photo design.

## Improvements over V8
- New always-available quick navigation; every tab changes the visible panel and URL fragment (`#audit`, `#payouts`, etc.). The large home hero is hidden outside Overview.
- Audit Log now has live event count, searchable text, filters by type, visible timestamps/actors, inspectable record fields, and JSON export.
- Recorded demo actions (contributions, payouts, signers, disputes and setup) appear in the audit panel; the log is editable browser storage, not immutable.
- Prefunded sample members who already contributed in a cycle now have a disabled contribution button with an explanation, rather than an error or a fake receipt.
- Configurable user-generated test circle still starts with R0, and its member amounts come from the entered inputs. Sample starter data is labeled as a fixture.
- Explicit link to original GitHub project; demo-only status remains prominent.

## Demonstration steps
1. Open `index.html`. Click `Audit log` from the top quick links, or open the URL with `#audit`. The starter fixture has one clearly labeled seed event.
2. Open `Payouts` with sample Thabo selected, click `Request scheduled payout`, then open Audit; a new payout request entry should exist.
3. For a full dynamic cycle open `Build your own circle` and enter 3 member names, R125 monthly contribution and R15 reserve. All balances start at R0.
4. For each member, switch identity and simulate a contribution (three records); open Audit Log and search `contribution`.
5. On Payouts, the scheduled recipient requests payment and cannot approve it. Switch to the other two members; each approves once. This is only browser logic.
6. The accessibility tab demonstrates local SMS/USSD/IVR/WhatsApp. Real telecom connections and identity-verification requirements are NOT satisfied.

## Blockchain claim — must not misrepresent
The browser module does not invoke the blockchain. The original GitHub Safe code uses Sepolia; an ordinary 2-of-3 Safe threshold does NOT by itself guarantee requester exclusion. A separately designed and verified on-chain guard/payout contract is needed for that exact guarantee. A Sepolia transaction link is **not proof** of the policy's correctness. Production bank-held rand cannot be secured by a Sepolia contract without additional real custodial/payment infrastructure.

## What "no crypto knowledge needed" currently means
The interface speaks about rand contributions and simple sign-off states; it has **no actual wallet-free custody, gas sponsorship, smart-wallet recovery or regulated fiat on/off-ramp**. Such services require genuine providers, audited code, informed user consent and regulatory review. This feature remains a product goal.

## Tests
- `node --test test/*.test.js` covers pure financial simulations and the local sandbox. The tests don't prove public telecom or blockchain settlement.
- `python test/browser/v9_full_flow.py` requires Playwright and Chromium. It checks desktop/mobile navigation, audit events, zero-balance group setup, a three-member contribution cycle, and self-approval rejection.

## Team / GitHub safety
Nothing in `yanamakan/Themba` was edited, merged, committed or pushed by this release. It remains a separate code review artifact. Do not merge without reconciliation with the team's latest source and any uncommitted work.
