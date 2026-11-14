# V10 team handoff — uncommitted add-on

**Scope:** standalone `extensions/themba-access-lab/` only; no existing GitHub team files overwritten.

## Yana (auth/backend)
- Map verified phone/WhatsApp login sessions to group-scoped authenticated identities and member roles.
- Implement idempotency, rate limits, authenticated contribution reconciliation from real settlement receipts, multi-device record history.
- Keep provider API secrets in trusted server environment; do not conflate phone identity with signing authorization.

## Astra (blockchain)
- Review TESTNET-ONLY candidate vault and decide if it is compatible with Safe 2-of-3; never assume it is.
- Compile and independently test on a real EVM, document deployment and token addresses, contract verification, transaction hash.
- Determine ERC-4337-compatible Safe account path, user-operation hashing/signatures, bundler+Paymaster, chain, fee sponsorship budget and safe recovery.
- Show a reverted self-approval and an executed payout with 2 different eligible non-recipient votes; do not rely solely on UI simulation.

## Accessibility (current isolated preview)
- Original Themba visual tokens, photographs, 12 language/access choices, USSD/SMS/WhatsApp/IVR demonstrations, reserve and risk lab, searchable audit.
- New V10 wallet-friendly journey with sandbox-only phone challenge (NOT authentication), dynamic group amounts, sponsorship readiness, real on-chain receipt verifier (only if env set).

## Release blockers
- Real OTP provider and audited smart-account custody; no real-world finance before legal review.
- Verified Sepolia vault + events + receipts; current repository Sepolia Safe is separate.
- Production identity and migration from locally writable demo state.
- Signed, reviewed translations and SASL interpretation.
- Actual telecom supplier accounts + E2E testing.

No commits/merges/deployments of the user team repository. If you deploy preview, keep user data fictional and access-controlled.
