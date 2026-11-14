# Themba JavaScript Integration Kit — V17

**Target:** `yanamakan/Themba`, branch `Feature/themba-complete-integration`.

Pure JavaScript (CommonJS/vanilla browser JS), compatible with existing Express 5, Node >=20, ethers v6, Safe SDK, and static HTML dashboards. **Additive-only:** all files are in `extensions/themba-v17/` except the optional `themba-v17.html` page and optional one-line host mount. No existing dashboard, auth, Supabase, Safe, or ledgers are replaced.

## Start in 3 steps
1. Unzip in your cloned repository root while on `Feature/themba-complete-integration`. Never overwrite unrelated files.
2. In existing `src/server.js` immediately after `app.use(express.json(...))` insert:
   `app.use('/api/themba-v17', require('../extensions/themba-v17/server/router')());`
   This must be **before** the final `/api` 404 handler. Do not mount publicly in production without auth, role enforcement and per-group authorization middleware.
3. Run `node --test extensions/themba-v17/tests/*.test.js`, then `npm test`, then `npm run check`; start with `npm start` and open `/themba-v17.html`.

**Safest demo:** the page works without the API using local illustration calculations. No user data is uploaded, and no transactions occur.

## What is included
- `server/finance.js`: deterministic cents-based loan quotes, affordability cap, group activity signals, inflation-adjusted savings targets (illustrative, not guaranteed returns), guarantor consent checks.
- `server/chain.js`: EVM chain-id, Safe address, owner uniqueness, threshold, expiry, nonce and duplicate-execution guards; tamper-evident HMAC audit records and verification. The audit journal is **not a blockchain** and not a substitute for on-chain finality.
- `server/router.js`: public, stateless **demo-only calculators**; no ledger mutation, real user lookup, disbursement or chain signing. Strict payload limits inherited from host.
- `web/`: accessible high-contrast/large text interface with classic Nokia USSD keypad simulation, Android preview, scrollable/collapsible sidebar, member/treasurer/admin views, loan/guarantor, insurance literacy, savings/inflation, Safe checks.
- `tests/`: unit and API smoke-style tests that do not require extra dependencies.
- `docs/`: integration/security checklist, ownership map, revenue model.

## Backend integration contracts
Never treat the demo activity score as an automated credit decision. Require: verified identity and permission; authenticated membership in the specified stokvel; explicit guarantor consent; affordability assessment and applicable lending compliance; human review; rate disclosures; audit trail; two independent group approvals. Do not use a client-submitted score for loan approvals. Real transfers must use existing Safe threshold signing, simulation, replay protections, and reconciled on-chain receipts. Verify chain id from a trusted RPC server, not browser request data.

## Merge conflict guidance
Add the new folder and page, then apply the single documented host mount yourself. If another teammate created an `extensions/themba-v17/` folder, review diff before merging. No forced commits or automated overwrites. Run `git status`, `git diff --check`, and `npm test`.

## Production gaps (deliberate)
The kit is a working demo and integration foundation, **not** a deployed banking, insurance, lending, telecom, or blockchain settlement service. Supabase persistence/RLS, regulated partner connections, real Safe multisig transactions, USSD telecom gateways, KYC/AML compliance, threat modeling and penetration testing are still required.
