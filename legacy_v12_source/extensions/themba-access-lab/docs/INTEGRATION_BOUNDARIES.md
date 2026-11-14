# Themba V6 integration contract — for Yana, Astra and the accessibility owner

## Current separation

- **Yana**: the shared `yanamakan/Themba` front end, Supabase auth and the API clients. GitHub `main` includes Yana work merged on 12 November 2026. The current extension is NOT a deployment of Yana's system.
- **Astra**: independent protected-payout wallet/contracts, not found as a merged vault in GitHub main at the time of this review.
- **Accessibility/payout-planning extension**: local demo logic, 12 South African language/access choices, SMS/USSD/WhatsApp/IVR simulators, rotation and reserve projections, bills and disputes. No trusted backend or custody.

## Proposed trusted read API

`GET /v1/member/me/groups/:groupId/summary` returns data **only after** server-side authentication, membership and role checks:

```json
{
  "groupId":"uuid-from-backend",
  "memberId":"uuid-from-auth",
  "currency":"ZAR",
  "rotationAvailableMinorUnits":0,
  "reserveAvailableMinorUnits":0,
  "memberVerifiedContributionsMinorUnits":0,
  "payoutCycle":1,
  "nextRecipientDisplayName":"from-database",
  "paymentStatus":"settled|pending|disputed",
  "asOf":"server-timestamp"
}
```

All figures must be **computed server side** from payment evidence and immutable ledger entries, not submitted by the browser or derived from the phone number. An access token/session is not a real bank PIN. No arbitrary groupId should bypass RLS.

## Proposed write API (backend, not public USSD)

- `POST /v1/groups/:id/payout-requests` with cycle, amount and idempotency key; requester derived from authenticated token.
- `POST /v1/groups/:id/payout-requests/:requestId/decisions` with approve/reject and validated signer identity, distinct approvals and recipient exclusion.
- `POST /v1/groups/:id/transactions/reconcile` is a **trusted settlement-adapter operation** only; requires bank/webhook or verified testnet evidence. A member clicking Confirm is not verification.
- `POST /v1/groups/:id/disputes` for authenticated members; auditable append-only resolution events, never record overwrites.

Never accept "payout confirmed", "balance" or "is_signer" from client-side values as authoritative. Set authoritative identity and permissions on the server. Protect all writes from duplicate submissions, replay and concurrency races.

## Astra smart-contract boundary

- Existing GitHub Safe has 2-of-3 signatures, but the original proposer may count as a signer. A UI check does not enforce requester exclusion onchain.
- Payout contract or guard must enforce **two different eligible non-requester signers** against the exact request, recipient, amount and nonce/expiry.
- Contract receipts (with network, address, txHash, confirmation state) must reconcile with pending/approved/settled DB states.
- Group reserve must never be silently counted as spendable rotation funds. Funds are not insured. Compromised wallets, key rotation and failed chain execution need explicit handling.

## Channel requirements

- **USSD**: Use a verified telecom provider, server-side signed/session-bound identity and strictly read-only information initially. Anonymous calls get menus but no balances. Production IVR/SMS require separate authorized telecom integrations.
- **SMS**: Explicit opt-in, STOP handling, localized short messages, sender verification and delivery receipts; no banking PIN collection or payout authorization via unauthenticated SMS.
- **WhatsApp**: Official Business Platform; approved templates and locale support, opt-in, message delivery/failure states and secure account linking.
- **Voice**: Human-reviewed voice recordings or tested voices; the browser TTS button is NOT a phone-call service. SASL requires qualified interpreted videos.

## Conflict avoidance

Only add files under `extensions/themba-access-lab/` or run this standalone preview. Do not overwrite `scripts/live-data.js`, `scripts/auth.js`, `scripts/supabase-client.js`, `dashboards/*`, the Safe bundle or wallet source. Wait for Yana and Astra to supply current schemas and contract ABIs; then write adapters and run end-to-end acceptance tests on a separate review branch. No GitHub commits were made in this task.
