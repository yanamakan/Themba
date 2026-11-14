# Themba V7 — Integration handoff to Yana, Astra and the accessibility/financial-planning team

**Created:** 13 November 2026  
**GitHub impact:** Zero commits, zero pushes, zero edits to `yanamakan/Themba`. Additive review package only.  
**GitHub baseline inspected:** `main` at `5c8c47b` (Yana PR #3 merged 12 November). Branch names and schema may change; recheck prior to integration.

## Important distinction

There are **two** runnable systems in this extension:

1. **Publicly shareable `index.html`** — responsive original-brand demonstration (including user-supplied images), multilingual SMS/USSD/WhatsApp/IVR browser simulations, rotating payouts, risk reserve, bills, governance, and the new **Market & Revenue Lab**. Financial data is local demonstration data; no backend authentication or live payments.
2. **Local `sandbox/sandbox.html` + `sandbox/server.js` + `sandbox/engine.js`** — a separate local integration sandbox. Uses registered *test* accounts, a SQLite file, bearer-session tokens, server-enforced group membership and signer roles, independent reconciliation simulation, two non-requester votes, a separate simulated settlement step, and append-only hash-linked ledger entries. **No real bank/chain/telecom provider**; no real identity verification. **Never deploy this development service publicly.**

## Local run

Requires **Node.js 22+** due to experimental built-in `node:sqlite` module. No third-party npm dependencies for the sandbox.

```bash
npm test
npm run serve:integrated
# Open http://127.0.0.1:8091/sandbox.html
```

Run the existing static demonstration separately with `npm run serve` if needed.

### Full walkthrough

1. Register three distinct users with 12+ character **test** passwords (never real credentials).
2. Login as first user, create a group. Group starts at zero rotation and reserve balance.
3. First user invites two other registered users **as signers**. Each user logs into their own account and accepts their own pending invitation.
4. All three report a simulated contribution. A **different** authorized signer must reconcile each report using a unique `DEMO-...` reference. No bank proof has been obtained, and the UI must say so.
5. First scheduled recipient requests payout. Self-approval must fail. The other two signers each approve; repeated approval must fail.
6. One signer clicks **Simulate final payout**. The rotation ledger decreases, but the separate reserve stays unchanged. No actual transfer takes place.
7. Use **Verify tamper-evident ledger chain**. Financial ledger entries cannot be edited/deleted through application SQL triggers, though database administrators may still bypass them.
8. Test an unauthorized user and duplicate payment reference; both must fail.

## Ownership — prevent conflicts

**Yana:** existing dashboard UI, Supabase Auth, live-data scripts and database schema. Do **not** overwrite `scripts/auth.js`, `scripts/live-data.js`, `scripts/supabase-client.js`, `dashboards/*` or production Supabase project. Coordinate exact group/member IDs and RLS policies.

**Astra:** protected payout contracts, transaction signing, on-chain event reconciliation. The local approval engine is **not** a replacement contract. Require exact request binding, recipient exclusion, two distinct signers, anti-replay and expired-request checks enforced by on-chain policy where appropriate.

**Accessibility/business team:** localization drafts, USSD/SMS/WhatsApp/IVR adapters, risk visualization, reserve explanation, revenue modeling. Only the browser demo and local API were changed inside this extension.

**Review-only SQL:** `sql/REVIEW_ONLY_supabase_policy.sql` is a *separate schema thought experiment*. It has **not been run** against Yana's database. DBA must verify it and merge with the real schema, not apply blindly.

## Mandatory release gates before money or real data

- Authorized team access to correct Supabase project/schema; independently verified RLS tests for member/nonmember/admin access.
- Production login, MFA/account recovery/phone-change protections and independently verified group owner appointments.
- Signed provider settlement evidence, webhook deduplication, reconciliation with actual bank/chain balances. Never credit merely because a button says “verified.”
- Separate group wallets, contract-enforced signer policy, security review, on-chain transaction proofs, execution failure recovery.
- Reviewed native-speaker financial translations; recorded audio/voice support; qualified SASL signed videos.
- USSD provisioned service code, telecom callback validation, verified phone binding, session timeouts, request throttling and support channel.
- SMS/WhatsApp opt-in, sender verification, STOP controls, template approval where needed, logs with no sensitive bank details.
- Legal/POPIA review for records, crypto custody, lending, guarantor liability and any insurance marketing.
- Browser integration testing across actual devices and browsers; security testing under concurrency/replay and provider outages.

**The two people who approve a payout are NOT automatically legal guarantors.** A separate, voluntary and appropriately reviewed guarantor agreement would be needed for that concept.
