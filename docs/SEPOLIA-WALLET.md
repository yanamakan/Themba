# Themba Sepolia wallet connection

## Purpose and current scope

The Member dashboard can connect to a browser wallet that exposes the
EIP-1193 provider API (for example, MetaMask), switch that wallet to Ethereum
Sepolia, and display the connected account's Sepolia ETH and Mock USDT
balances. Its separate Safe panel can also use an authorized wallet for
testnet contributions and Safe transactions.

The personal-wallet balance view remains **read-only** and does not itself
connect to or operate a stokvel's shared wallet. Separately, the dashboard's
Safe panel supports Sepolia Mock USDT contributions and multisig proposals,
approvals, and execution. Those Safe actions require an authorized wallet
interaction and are documented below and in
[`DASHBOARD-ACTIONS.md`](./DASHBOARD-ACTIONS.md).

The project's requirements describe a prototype using testnet assets only.
The token is presented as Mock USDT in the interface and has no real monetary
value. It is not official or redeemable Tether USDT.

## Network and token configuration

| Setting | Value |
|---|---|
| Network | Ethereum Sepolia |
| Chain ID | `11155111` (hex `0xaa36a7`) |
| Mock token contract | `0xA6747B2a329FDc8550c1f2892dCc45dF9E537b9c` |
| Token interface used | ERC-20 `balanceOf(address)` and `decimals()` |
| Native asset shown | Sepolia ETH |
| Wallet connection protocol | Injected EIP-1193 provider |
| Ethers.js version family | Ethers v6 |

During implementation, the supplied address was queried on a public Sepolia
RPC. The address returned non-empty contract bytecode; its `symbol()` call
returned `USDT`, and its `decimals()` call returned `6`. This is a point-in-time
network check, not an audit or verification of the deployed contract's source,
ownership, controls, or economic properties. The UI intentionally labels the
asset **Mock USDT** to avoid presenting it as official Tether.

The configured address is currently a source-code constant in
[`scripts/dashboard.js`](../scripts/dashboard.js). It is public contract
metadata, not a secret. If the token is redeployed, update this constant and
the address shown in [`dashboards/members-dashboard.html`](../dashboards/members-dashboard.html)
together.

## User experience

1. The dashboard starts with no account shown and no on-chain balances. The
   overview's balance card identifies its portfolio value as sample dashboard
   data, not a value from the connected wallet.
2. The user selects **Connect wallet** on the overview or wallet page.
3. If the browser has no injected wallet provider, the dashboard displays an
   installation/help error and does not fabricate a connection.
4. The wallet asks the user to grant account access. Themba does not receive a
   seed phrase or private key.
5. Themba requests a switch to Sepolia. If the wallet reports that Sepolia is
   not configured, Themba asks it to add Sepolia using:
   - RPC URL: `https://rpc.sepolia.org`
   - Explorer: `https://sepolia.etherscan.io`
   - Native currency: Sepolia Ether (`ETH`, 18 decimals)
6. Once connected to Sepolia, the dashboard reads the account's Mock USDT
   balance and native ETH balance, and displays the shortened account address.
   The full address is available as the address element's tooltip and via
   **Copy address**.
7. **Receive address** opens a dialog with the connected personal account
   address and a copy action. It is not a group or multisignature wallet
   address.
8. **Clear wallet from this view** clears the address and balances from
   Themba's in-memory page state. It does not revoke the browser wallet's
   permission; the user must revoke site access in the wallet extension if
   desired.

If the wallet is on another network, balances are cleared and the UI indicates
that Sepolia is required. The connect control becomes **Switch to Sepolia**.
The user must approve a network change in their wallet.

## Implementation details

### Browser bundle

[`scripts/dashboard.js`](../scripts/dashboard.js) imports
`BrowserProvider`, `Contract`, and `formatUnits` from Ethers.js. Because the
dashboard is static HTML, esbuild bundles this module and its dependencies into
[`scripts/dashboard.bundle.js`](../scripts/dashboard.bundle.js). The Member
page loads that generated browser bundle.

Run `npm run build` after changing the wallet module. `npm run check` also
builds the bundle, and `npm test` builds it before running the tests. Do not
edit the generated bundle directly.

### Read-only contract calls

The small ABI in the dashboard contains only:

```text
function balanceOf(address) view returns (uint256)
function decimals() view returns (uint8)
```

After confirming the Sepolia chain, the dashboard creates an Ethers
`BrowserProvider` around the injected provider and runs these reads in parallel:

- `provider.getBalance(account)` for native Sepolia ETH.
- `token.decimals()` for the token's display precision.
- `token.balanceOf(account)` for the ERC-20 balance.

The token balance is formatted with the contract's reported decimals. The ETH
balance is formatted with 18 decimals. Both are displayed with up to four
fractional digits (extra digits are truncated for display); the underlying
integer values are not changed. The UI displays no ZAR conversion or fiat
valuation for these on-chain balances.

Before displaying a completed read, the code checks the active network and
account again to avoid showing a result returned for an account or network
that changed while the requests were in flight. Invalid token decimals and
failed provider/contract calls are not treated as successful balances.

### Account and network changes

When the provider supports event subscriptions, the dashboard listens for:

- `accountsChanged`: clears the connection when no account remains available,
  or reloads balances for the newly selected account.
- `chainChanged`: updates the displayed network and reloads balances only when
  the new network is Sepolia.

The connection is kept in page memory only. Reloading the page starts
disconnected; the user can reconnect. No wallet address or balance is sent to
the Themba backend or saved in browser storage by this wallet feature.

### Error behavior

The UI reports when no injected wallet is available, when the user rejects the
connection or network switch, and when balance reads fail. Errors are logged
to the browser console for debugging. A failed balance read leaves the wallet
connected but shows that the balance is unavailable; it does not display a
sample balance as if it were current on-chain data.

## Security and product boundaries

- The browser wallet holds and controls the user's personal account. Themba
  never handles its private key or asks for a seed phrase.
- The personal-wallet balance view requests account access and performs public
  read operations; that view itself does not request a transaction signature.
  The separate Safe panel may request wallet signatures for the explicitly
  initiated Safe actions.
- The wallet connection is not authentication for a Themba user and does not
  authorize access to private stokvel data.
- The displayed personal account is not a group shared wallet. Do not send
  group funds to it on the assumption that it implements the required
  multi-signature policy.
- The Safe panel supports Sepolia Mock USDT contributions and Safe withdrawal
  proposals, approvals, and execution by Safe owners. The configured Safe's
  on-chain threshold is authoritative for execution; wallet interactions are
  explicit and the user must confirm them.
- Sample approvals elsewhere on the dashboards are browser-only votes. They
  are not Safe signatures and do not approve, reject, or execute a Safe
  transaction. Loan requests and sample bill approvals are not enforced by
  this Safe transfer flow.
- The Safe proposal code verifies that the proposer/approver is a Safe owner,
  but the application does not implement a separate rule excluding a
  withdrawal requester from signing their own request. Do not treat the
  sample dashboard vote or current Safe UI as enforcement of that business
  policy.
- Local dashboard records are not an on-chain audit trail. The Safe
  Transaction Service and Sepolia transaction explorer provide the relevant
  proposal/transaction references; clearing browser demo storage does not
  undo blockchain activity.
- Sepolia ETH is a test-network asset used for network operations; it is not
  presented as fiat value. Testnet tokens can be valueless or unavailable and
  must not be used as real funds.
- The sample portfolio number elsewhere on the dashboard is mock UI data and
  is explicitly separate from the wallet balance reads.

## Files changed for this feature

- [`scripts/dashboard.js`](../scripts/dashboard.js): Ethers provider,
  Sepolia network handling, ERC-20/native balance reads, event listeners,
  and wallet UI state.
- [`scripts/dashboard.bundle.js`](../scripts/dashboard.bundle.js): generated
  browser bundle.
- [`dashboards/members-dashboard.html`](../dashboards/members-dashboard.html):
  wallet connection controls, Sepolia status, Mock USDT details, and
  read-only balance display.
- [`dashboards/dashboard.css`](../dashboards/dashboard.css): wallet
  connection status and disabled-control styling.
- [`package.json`](../package.json) and [`package-lock.json`](../package-lock.json):
  Ethers.js, esbuild, and build/check/test scripts.
- [`src/server.js`](../src/server.js): static hosting and redirects for the
  reorganized login and signup pages; no wallet secret or signing endpoint was
  added.
- [`test/server.test.js`](../test/server.test.js): static-resource coverage,
  including the generated browser bundle.

## Build and verification

From the project root:

```powershell
npm install
npm run check
npm test
npm start
```

Then open `http://localhost:3000/dashboards/members-dashboard.html` in a
browser with a wallet extension installed. Select **Connect wallet**, approve
the account request and Sepolia network switch, and check the wallet page's
network and balance values. For meaningful balance verification, use a test
account whose Sepolia ETH and Mock USDT balances are known.

The implementation was verified with the project checks and tests. The
browser-flow check used a mocked injected wallet provider and confirmed the
network status and formatted sample return values. That validates the
connection and rendering logic, but is not a substitute for testing with a
real wallet extension and funded Sepolia test account.

## Suggested next milestone

The next step for group funds is to design and deploy the Sepolia shared-wallet
contract, not to enable the personal-wallet Send button. The contract should
enforce the agreed signer set, two-of-three approvals, requester exclusion,
and protected execution on-chain. The application can then propose contract
transactions, collect signatures, submit only when the contract's rules are
satisfied, and record transaction hashes and audit details. The database and
authorization layer must independently enforce which users can see each
stokvel's records.
