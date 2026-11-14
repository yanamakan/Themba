# Themba V7 — inclusive community savings review

**IMPORTANT**: This package does NOT contain a deployed production financial platform. No changes or commits have been made to the original GitHub repository.

## Two modes

### 1. Browser-only shareable demonstration

`index.html` retains the original Themba charcoal-green/gold visual language, includes the two user-provided savings images, local configurable groups, contributions, reserve separation, risk projections, two-person payout approvals, cash claim, bill splitting, loan review records, dispute log, 12 official language/access options and USSD/SMS/WhatsApp/IVR *simulators*. V7 also adds an interactive Market & Revenue Lab with editable assumptions and transparent break-even calculations.

No real member data, passwords, identities, payments, blockchain or telecom services are connected to this browser UI. Initial fixtures are synthetic and clearly marked. Create a new circle with user-entered names/amounts to start from zero, or use the preloaded examples to explore quickly.

### 2. Local server-backed integration sandbox — new in V7

The **separate** `sandbox/sandbox.html` page is served by `sandbox/server.js`, using `sandbox/engine.js` and built-in Node SQLite. It requires real *test account* login, group invitation acceptance, server-enforced signer roles, separate accounting for rotation and reserve, two independent non-requester approvals, independent simulated contribution reconciliation and a separately initiated simulated payout step. Financial entries are stored in local SQLite with append-only triggers and a hash chain. The hash chain is **tamper-evident**, not cryptographically immutable against database owners.

Requires Node.js **22+** (built-in SQLite is experimental in this version). For review only on your own computer:

```bash
npm test
npm run serve:integrated
# http://127.0.0.1:8091/sandbox.html
```

**Do not expose the local integration server on the public internet.** It does not yet have production abuse controls, identity proofing, compliance, anti-SIM-swap protection or bank settlement.

### Separate V6-style static/API callback demo

`npm run serve` serves the static index and public read-only USSD callback. `POST /api/ussd` returns `CON` / `END`; no personal balances are returned without verified user identity. SMS preview does not send a message. For a commercial USSD code, acquire provider provisioning and secure callback/identity linkage.

## Tests

`npm test` executes browser-pure logic tests, USSD gateway tests, local SQLite integration tests, HTTP tests, group isolation, duplicate payout rejection, immutable-entry triggers, reserve accounting and financial projection calculations. Keep failures visible; do not claim production security from tests alone.

## Team work boundaries

See `docs/TEAM_HANDOFF_V7.md` and `docs/INTEGRATION_BOUNDARIES.md`. Yana's Supabase changes and Astra's payout smart-contract changes have **not** been merged. A separate `sql/REVIEW_ONLY_supabase_policy.sql` is a schema design reference and **has not been applied** to anyone's database. Do not use it blindly without reviewing current migrations.

## Product and business

See `docs/BUSINESS_CASE_V7.md` for evidence, competitor benchmarks, pricing hypotheses and profit sensitivity. The Market & Revenue Lab inputs are scenarios, not actual Themba income.

## Hackathon judge mode (V8)

The new `W3Node judge mode` tab is a review-only addition. It provides official-track alignment, the 5-minute demonstration journey, user-facing crypto abstraction architecture, the actual remaining blockers and a Sepolia explorer link builder that does NOT claim to verify contract execution. See `docs/W3NODE_HACKATHON_READINESS.md` and `docs/QUICK_PITCH_90_SECONDS.md`. No secrets, private keys or real funds.
