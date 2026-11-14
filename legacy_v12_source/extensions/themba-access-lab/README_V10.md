# Themba V10 — Invisible Web3 Proof Lab (TESTNET ONLY)

This version is an additive-only extension to the Themba design and V9 accessibility prototype. It has not replaced or modified any GitHub branch.

## Delivered
- Working HTML demo with 11 navigation pages, original Themba dark/gold design and user-supplied savings photographs.
- Configurable sample circles, contributions, separate reserve, rotating payout requests, independent 2-signer approval checks, sample local audit, bills, loan review and USSD/SMS/WhatsApp/IVR demos.
- New phone-first UX flow with locally generated *fictional* code; NOT real phone authentication.
- Paymaster/bundler configuration status; not an operational gas sponsor.
- Read-only Sepolia receipt verification server function, configured only by reviewed RPC + approved vault address. Does not claim that a receipt proves two approvals or gas sponsorship.
- Standalone, unaudited, NOT COMPILED Solidity rotating vault candidate for testnet-only research.
- Existing server-backed local SQLite sandbox retained.

## Run locally
```sh
cd extensions/themba-access-lab
node --test test/*.test.js
node dev-server.js
# browser: http://localhost:8077 (local demo; see dev-server.js)
node sandbox/server.js
# separate localhost-only authenticated SQLite sandbox on its logged port
```
The browser-only demo is not the trusted server sandbox. The public Vercel deployment must never be used to collect real savings or financial credentials.

## Environmental variables (server only)
`THEMBA_SEPOLIA_RPC_URL` and `THEMBA_SEPOLIA_VAULT_ADDRESS` enable read-only verification of direct transactions to a reviewed deployed vault.
`THEMBA_4337_BUNDLER_URL` and `THEMBA_4337_PAYMASTER_URL` merely show configuration; the actual user-operation implementation is not connected.
Never store private keys or provider credentials in the HTML. No live payments.

## What is not finished
Real OTP/WhatsApp authentication, embedded wallets, user-operation signing, Paymaster gas sponsorship, deployed audited contract, EAS attestations, bank verification, real USSD and voice calls, production-ready SASL videos and reviewed translation.

## Important
A Paymaster *does not magically add gas sponsorship* to the existing 2-of-3 Safe. Compatible ERC-4337 Safe modules, user operations, contract guards, secure signers and a sponsor policy are needed. The candidate vault is separate and not drop-in compatible.
