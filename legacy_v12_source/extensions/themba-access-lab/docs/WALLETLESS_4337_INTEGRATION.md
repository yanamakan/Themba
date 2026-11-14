# Themba: wallet-friendly Web3, not a fake wallet-free blockchain

## What this implementation does now
- Existing V9 financial and accessibility DEMO is preserved.
- V10 adds a phone-first journey prototype, an independently readable integration status endpoint, and a read-only Sepolia receipt verifier.
- A separately written **testnet-only candidate** rotating vault Solidity contract enforces contributions, two distinct non-recipient approvals, one successful payout per cycle, and reserve segregation by code. **It is NOT compiled, audited, deployed, funded, or integrated with existing Safe, and has no actual testnet proof yet.**
- The local server-backed SQLite sandbox still implements group-specific membership and independent approvals with tests, but it is NOT production identity.

## How gasless phone onboarding actually works (future integration)
1. Phone OTP or WhatsApp OTP through a supported provider, verified by backend. Phone numbers are personally identifying, so use consent, rate limits, SIM-swap recovery and secure roles. Never send or expose OTPs to the transaction signer.
2. Provision a securely managed ERC-4337 smart account for each appropriate member or committee. Ask users to authorize actions plainly; do not silently sign on their behalf.
3. Use a bundler + verifying Paymaster through an authenticated backend with sponsorship rate limits. Gas is paid by a sponsor, not free in absolute terms.
4. Map an approved PayoutRequest to an exact-chain, exact-contract user operation with amount, payee, expiry, nonce and membership checks; only an approved vault can release group tokens.
5. Display completed only when chain receipt is verified, and confirm contract event semantics (including 2 distinct non-recipient approvals). A receipt for an arbitrary tx is insufficient.

**Existing Sepolia Safe flow is a separate system**: Safe 2-of-3 by itself lets the requester owner count as one approver; add and verify contract/module restrictions, or explicitly choose the standalone candidate vault after team review. Do not swap custody under the same group balances silently.

## Configuration (server only; never include provider keys in browser bundles)
- `THEMBA_SEPOLIA_RPC_URL`: trusted HTTPS Sepolia RPC; only read-only queries used by V10 proof verifier.
- `THEMBA_SEPOLIA_VAULT_ADDRESS`: deployed and peer-reviewed vault contract on chain 11155111.
- `THEMBA_4337_BUNDLER_URL`: tested bundler endpoint.
- `THEMBA_4337_PAYMASTER_URL`: tested Paymaster endpoint.
- The existence of these variables only reports **configured**, never executed or gas sponsored.

## Chain receipt verifier limitations
`GET /api/verify-sepolia?hash=0x...` verifies eth_chainId, receipt status, target contract, and minimum block confirmations when configured. It **does not** establish that a payout rather than another call executed, or that a Paymaster paid gas. A sponsored ERC-4337 user-operation transaction normally targets the EntryPoint contract, not the vault directly; this direct-target receipt verifier will therefore NOT certify such a transaction. Use verified UserOperation receipts and decoded vault events for that pathway. Proper event and signed user-operation verification remains. No signing RPC is supported.

## Testnet-only Solidity contract review gate
`contracts/ThembaTestnetRotatingVault.sol` is a prototype requiring manual security review, actual compilation, Solidity-level tests for token transfer failures/reentrancy/expiry/membership boundaries, and Sepolia deployment using *worthless* test tokens. It was not compiled here because solc/Foundry were unavailable; JS tests do not certify Solidity bytecode.

## 3-minute demo
- 0-35s: show real problem and simple phone-first UX.
- 35-75s: show configurable contribution and scheduled payout.
- 75-130s: demonstrate self-approval blocked, second eligible approver, and reserve untouched.
- 130-155s: show chain proof status honestly, with explorer link for actual tx only if teammate has one.
- 155-180s: show language/USSD and paid treasurer tools.

**No Aave, lending, automatic APY, or 'inflation beaten' claims in the MVP.**

For this fixed signer design, configure **at least three signers** so even if a scheduled recipient is a signer, two different non-recipient signers remain eligible.
