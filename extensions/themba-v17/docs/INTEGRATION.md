# Integration contract and ownership map

- **Host app:** preserve `src/server.js`, `dashboards/`, `scripts/dashboard.js`, existing Supabase auth/RLS, and Safe proxy. Add only `/api/themba-v17` router before fallback 404.
- **UI:** `themba-v17.html` is a new isolated route, so no conflicting dashboard JS or CSS globals. Link it from existing member / treasurer / admin nav when ready. Do not rename existing navigation keys.
- **API:** calculators do not query user accounts or mutate group data. Never accept a client-set role or score as authorization.
- **Auth and RLS:** before saving credit history or guarantor consent, enforce Supabase verified claims + stokvel membership and RLS on server/database. Audit permissions per role. Encrypt sensitive records.
- **Guarantors:** explicit opt-in, clear liability disclosure, identity verification, right to refuse, revocation before acceptance; do not display their private details to other members.
- **Loan policy:** rates and eligibility require licensed legal review and applicable SA NCA checks. Require affordability and grievance/appeal route, no automatic approval by activity score.
- **Insurance:** educational comparison only. Do not claim cover, collect premiums or imply CODI protection for stokvel/crypto funds. Partner with authorized insurer and disclose exclusions/consent.
- **Safe/Sepolia:** validate chain from trusted RPC; reconcile on-chain owners/threshold/nonce and token decimals; simulate transaction; require independent signatures; enforce idempotency and event confirmations; protect against replay, chain switching and contract upgrades; never put private keys in front end. HMAC journal is off-chain tamper evidence, not blockchain settlement.
- **USSD/feature phone:** screen is simulation. To ship, integrate licensed telecom aggregator, session IDs, replay protection, rate limiting, data minimization, and SMS costs.
- **Operations:** ensure safe error handling, audit retention, monitoring, treasury separation, backups, migration rollback, privacy and security review.

## Optional host mount
```js
// Immediately following app.use(express.json({ limit: '16kb' }));
app.use('/api/themba-v17', require('../extensions/themba-v17/server/router')());
```

The included UI does not require the route to run; it uses browser-only calculators with labels indicating simulation. No existing files need replacement.
