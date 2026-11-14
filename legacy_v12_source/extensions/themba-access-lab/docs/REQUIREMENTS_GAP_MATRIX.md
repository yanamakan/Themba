# Themba requirements audit — honest status, 13 November 2026

**Basis:** `Themba_System_Requirements.docx` FR01–FR13, NFR01–NFR09 and BR01–BR09; `Themba Project Concept.docx`; current `yanamakan/Themba` main (`5c8c47b`, 12 Nov 2026); and separate Themba V6 extension. `main` source checked through GitHub connector. This is a code and functionality review, **not** a bank/chain/telecom penetration audit.

Legend: `DEMO`= working browser or callback simulation; `REPO`= existing code but integration, backend policy or deployment not independently proven; `MISSING`= neither verified end-to-end nor in the separate preview. These categories can overlap.

| Requirement | GitHub main | V6 extension | Next completion gate |
|---|---|---|---|
| FR01 Secure registration/login | REPO: Supabase UI/auth scripts exist | MISSING | Verified Auth and tests with real backend permissions |
| FR02 Create/join stokvel | REPO: frontend RPC clients | DEMO: configurable new local circle | Invitation/acceptance backend end-to-end |
| FR03 Member/role management | REPO: frontend RPC clients | DEMO: 3 mock signers and selectable members | Authenticated role changes/RLS tests |
| FR04 Shared USDT wallet per group | REPO: original single configured Sepolia Safe | MISSING | Separate group-controlled testnet wallets and policy audits |
| FR05 2-of-3 authorization | REPO: Safe 2-of-3, original requester counts | DEMO: two **non-requester** approvers | Contract-level requester exclusion and on-chain test |
| FR06 Monthly contributions | REPO: UI and RPC helpers | DEMO: dynamic cycle amounts and UI | Settled payment proof and idempotency |
| FR07 Member-confirmed cash | REPO: UI and RPC helpers | DEMO: distinct logger/member and separate mock settlement | Independent reconciliation or real proof |
| FR08 Equal/custom/% bills | REPO: UI and RPC helpers | DEMO: split arithmetic and simulated shares | Trustworthy paid-share ledger and tests |
| FR09 Loans/repayment/overdue | REPO: UI helpers | DEMO: requests and independent review only | Legal review, repayment schedule and settlement records |
| FR10 Transaction history | REPO: API helpers | DEMO: local audit/transactions | Shared immutable backed-up ledger |
| FR11 Approval audit | REPO: API helpers | DEMO: actor/time events local only | Server-authenticated immutable decisions |
| FR12 Suspicious activity alerts | REPO: UI/alert reads | DEMO: local blocked-action events | Automatic server detection + delivery + rate limits |
| FR13 Dashboard | REPO: member/treasurer pages | DEMO: responsive UI | Unified backend view, roles and signed financial state |
| NFR01 Security | PARTIAL/UNVERIFIED | DEMO-ONLY; public API redacts unauthenticated financial data | Threat model and independent tests |
| NFR02 Immutability | Not proven | MISSING: localStorage editable | Append-only DB & chain contract checks |
| NFR03 Transparency | PARTIAL | DEMO scoped per group | Verified private membership scopes |
| NFR04 Reliability | PARTIAL | 77 isolated engine/gateway tests; browser check unavailable in this run | Provider and bank end-to-end tests |
| NFR05 Usability | PARTIAL | Simplified demos, localization drafts | Native-speaker usability trials |
| NFR06 Responsiveness | REPO designed responsively | HTML responsive styling | Independent device/browser QA |
| NFR07 Performance | Not benchmarked | Static app + small callbacks | Load and latency tests |
| NFR08 Scalability | Unverified | MISSING: browser-only fixtures | Database and gateway load tests |
| NFR09 Accountability | PARTIAL | Simulated audit actor choices are not authenticated | Verified identity/signer audit and recovery |
| BR01 No payout before approvals | Original Safe threshold 2 | DEMO | Enforced backend and smart contract |
| BR02 No initiator self-approval | Original Safe lacks contract guard | DEMO | Smart contract verification |
| BR03 2 designated distinct signers | REPO Safe 2-of-3 threshold | DEMO distinct signers | Signed transaction binding to request |
| BR04 Immutable entries | Not confirmed | MISSING | Database controls and correction-only workflow |
| BR05 Corrections as entries | Not confirmed | DEMO disputes, not true corrections | Ledger reversal/correction design |
| BR06 Member-confirmed cash | REPO API helpers | DEMO | Verified independent identity |
| BR07 Automated suspicious alerts | Not confirmed end-to-end | DEMO | Server detection, notifications |
| BR08 Member/group access | REPO expects RLS | DEMO check, *not secure* | RLS and auth escalation tests |
| BR09 Actor/time approval record | REPO API helpers | DEMO | Server-generated traceable audit |

## Extensions from later discussions

| Feature | V6 | Production next step |
|---|---|---|
| Rotating payout order and risk exposure | DEMO | Agree binding group constitution and legal terms |
| Protection Reserve | DEMO separate ledger balances | Group trust and custody/reserve-claim policies, no insurance claims |
| Staged and save-first payout illustrations | DEMO configurable staged % | Actual contract/escrow implementation if group approves; none active |
| Two approvers as personal guarantors | NOT implemented | Separate voluntary legal agreement and regulatory review; approval ≠ guaranty |
| All SA official language choices | 11 draft spoken-language text menus + SASL caption fallback | Reviewed translations, proper locale coverage, qualified SASL video |
| USSD, SMS, WhatsApp, IVR | Demo; USSD callback works with `CON/END` | Telecom onboarding, auth, rate limiting, messaging consent, voice provider |
| Lost-phone/identity recovery | MISSING | Secure account recovery, anti-SIM-swap procedures |
| Real bank settlement confirmation | MISSING | Trusted payment partner + bank/settlement webhooks |
| Offline/low-data UI | DEMO: hides images | Secure caching and offline queue/retry policy |
| Subscription billing and partner integrations | MISSING | Pricing validation, contracts and compliant payments |
| Real community adoption | MISSING | Pilot with consent, metrics, usability and translation validation |
| Regulated insurance/lending | NOT offered | Legal and licensed-partner assessment |

**Summary:** A substantial set of concepts is **implemented as a demo**, but the full plan is **not** finished as a secure shared production application. The V6 link is **not** a deployment of GitHub main, and one passing unit suite does not demonstrate cross-app integration.
