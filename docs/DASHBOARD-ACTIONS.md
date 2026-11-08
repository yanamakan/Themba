# Dashboard actions and browser demo state

## Scope

The Member, Treasurer, and Platform Admin dashboards provide working
prototype interactions. Non-blockchain changes are saved in the current
browser's `localStorage`; they are not sent to the Themba API, a database, or
other members. This is demo persistence, not shared or production data.

Sepolia wallet and Safe operations are separate. A button or vote on one of the
sample dashboard approval cards is a **browser-only demo action** and does not
approve, reject, or execute a Safe transaction. Real Safe operations require a
connected Sepolia wallet and the wallet's explicit confirmation.

## Browser storage

[`scripts/demo-state.js`](../scripts/demo-state.js) loads before each dashboard
script and exposes `window.ThembaDemo`. Its versioned state is stored under the
localStorage key `themba_demo_state_v1`. State is scoped by browser and site
origin: it does not follow a user to another browser or device. Dashboard
sessions use the separate `themba_session` key.

The helper supports:

- `add(collection, record)`: add a record with an ID and creation timestamp,
  append a corresponding event, persist, and dispatch
  `themba:demo-state`.
- `update(collection, id, changes)`: update an existing record, append an
  event, persist, and dispatch the same event.
- `list(collection)`: read records from a known collection.
- `getPreference(name, fallback)` and `setPreference(name, value)`: read and
  persist UI preferences in the same versioned state.

Collections initialized by the store are `approvals`, `bills`, `contributions`,
`events`, `invites`, `loans`, `members`, `notifications`, `reminders`, and
`stokvels`. Preferences such as selected group and notification read state are
stored as top-level entries in the state object, alongside `collections`.

The dashboard scripts restore saved records and preferences on page load.
Storage and data errors are logged to the browser console and shown in the
dashboard rather than being reported as a successful save.

To clear browser demo data, open the browser's developer tools, find
**Application/Storage → Local Storage** for the Themba site origin, remove
`themba_demo_state_v1`, and reload the dashboard. This does not undo or erase
Sepolia transactions. Removing `themba_session` separately signs out the
current demo session.

## Member dashboard

[`dashboards/members-dashboard.html`](../dashboards/members-dashboard.html)
loads the shared store and the generated dashboard bundle. The main workflows
are:

| Action | Result |
|---|---|
| Apply for a loan | Saves a pending browser demo loan and adds it to the loan list. |
| Create a bill | Saves a browser demo bill and displays it in Bill splitting. |
| Create a stokvel | Saves a local demo group and adds it to the group selector. |
| Approve a membership request | Saves the sample member decision and updates the member list. |
| Confirm cash receipt | Saves a local receipt confirmation; it does not record an on-chain payment. |
| Approve/reject the sample withdrawal | Saves a demo vote and restores its state after reload. It has no effect on a Safe proposal. |
| Mark notifications read | Saves the read preference for later visits. |
| Generate an invitation code | Saves and displays the newly generated local code. Copy actions use the browser clipboard when available. |
| Select a group | Saves the selected group. Custom demo groups display a zero demo balance until data exists. |

The demo activity notice in the Transactions view explains that local entries
are not an immutable ledger. The export action includes existing sample rows
and saved demo loans, bills, and confirmed Safe contributions.

Admin dashboard loan and bill shortcuts navigate to this dashboard, open the
relevant view, and show its form.

## Treasurer dashboard

[`dashboards/treasurer-dashboard.html`](../dashboards/treasurer-dashboard.html)
uses the same browser store:

- **Confirm receipt** saves a local confirmation, updates matching receipt
  controls, status labels, and pending counts, and restores those updates
  after reload.
- **Send reminder** records a reminder locally and marks the control as
  recorded. It does **not** send an email, SMS, push notification, or message
  to a member.
- The sample withdrawal **Approve/Reject** controls save a local demo vote.
  Their labels and feedback state that the Safe is not affected.
- **Review** on the sample loan request expands and collapses its sample
  description; it does not approve or fund a loan.
- Search, filters, navigation, profile updates, and report exports operate on
  the dashboard's displayed data.

## Platform Admin dashboard

[`dashboards/platform-admin-dashboard.html`](../dashboards/platform-admin-dashboard.html)
also restores local preferences and records:

- Create stokvel opens a form and saves a local demo group to the admin group
  list. The form explicitly notes that the group is not shared with members.
- The sample approval controls save a browser-only vote, not a Safe signature.
- Balance visibility, displayed currency, and the sample wallet connected
  toggle persist as UI preferences. **Demo wallet connected** is only a visual
  demo state; it does not connect a wallet or represent real assets.
- Member and stokvel controls display the selected sample record's details.
- The contribution shortcut leads to the Safe panel. Loan and bill shortcuts
  navigate to the corresponding Member form.
- Search, transaction filters, navigation, profile updates, and CSV export are
  available for the displayed sample data.

Only the on-page sample stokvel creation form creates a new local admin stokvel.
Other existing sample cards remain illustrative dashboard data.

## Actual Sepolia/Safe actions

The Safe panel is separate from the sample approval cards:

- A Member can send Mock USDT from their own wallet into the configured Safe.
  This ERC-20 transfer is an on-chain Sepolia transaction and requires wallet
  confirmation.
- An authorized Safe signer can propose a Mock USDT withdrawal. The proposal
  is submitted to the Safe Transaction Service and its proposer signature
  counts toward the Safe's threshold.
- Another authorized signer can add an approval; once the threshold is met, an
  authorized signer can execute the transfer on-chain. Each signing or
  execution action requires a wallet interaction.
- A simulated dashboard vote is never treated as a Safe signature or as
  confirmation that funds moved.

See [`SEPOLIA-WALLET.md`](./SEPOLIA-WALLET.md) for network, token, and personal
wallet details. Safe operations and current configuration are described in
[`scripts/safe-transfer.js`](../scripts/safe-transfer.js) and
[`scripts/safe-panel.js`](../scripts/safe-panel.js).

## Build and verification

The Member dashboard loads `scripts/dashboard.bundle.js`, which is generated
from `scripts/dashboard.js`. After editing the source module, run:

```text
npm run build
npm test
```

Do not edit the generated bundle directly. Browser demo state is not covered by
the server API tests; exercise key actions in the browser and reload the page
to verify their persistence.
