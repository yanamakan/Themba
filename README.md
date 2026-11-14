# Themba updated review package

## What is inside
- `index.html`: updated full V16 review interface with the inclusive-access handset design and local demo invitation flow.
- `legacy_v12_source/`: archived V12 complete source and tests for integration reference. It is **not** the exact V15 deployed source.

## Run
Open `index.html` in a browser or serve with `python -m http.server 8080` and navigate to `http://localhost:8080`.

## Invitation demo walkthrough
1. Open My stokvels. Enter `lerato@themba.demo` in Invite (or another existing demo email such as `thabo@themba.demo`, `sipho@themba.demo`, `nomsa@themba.demo`, `neo@themba.demo`, `zola@themba.demo`).
2. Click Prepare invitation, copy the code, then Accept an invitation with the same email/code.
3. The existing member record joins the selected circle without creating a second account; previous memberships and history are retained in the local simulator.
4. To test cross-circle invitations, pick a group the member does not already belong to.

## Critical production limitations
The V16 review page is a browser-local simulator, not a real authentication or email service. Copying an invitation is not sending an email. Demo invitation codes are held in localStorage and should NEVER be used as production security tokens. Account email mappings in this demo are not verified identities.
For production integrate with existing auth user IDs, normalized unique verified email, token hashes + expiry, email jobs and an idempotent unique `(group_id,user_id)` membership constraint. Accept invitations only in the authenticated user's session after checking their verified email and token server-side. Make changes atomic and auditable. Preserve each user's existing account ID, wallet links and transaction records. Forbid any auto-registration or automatic wallet replacement on invitation acceptance. Require server authorization for creating invites.

## Version transparency
The exact V15 preview is a protected Vercel deployment; its full source could not be exported here. This package is based on the available V16 HTML and an archived V12 source ZIP, so it must not be represented as byte-identical to that V15 deployment.
