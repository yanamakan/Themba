# Yana invitation and account identity fixes

Source: `yanamakan/Themba`, **Yana** commit `549f2d2f5b9570196844902402320742fd31a300` (immutable snapshot). Only the local download is modified. **No changes are pushed to GitHub.**

## Fixed

- Existing Themba users follow an invite link to **login** and redeem it against their existing Supabase identity; no second account is created.
- New users can sign up; their pending invite survives the email-confirmation redirect.
- Failed or rejected acceptances leave the invite token in session storage for retry, rather than falsely appearing successful.
- Invitation generation is backed by authenticated `invite_member` RPC, bound to a selected stokvel and eligible role. The database must independently enforce invitation authorization and email matching.
- The separate dashboard handler which previously submitted a generic invitation code to `/api/send-invite` is disabled; the page's capture handler prevents a stale prebuilt bundle from making a second request.
- The unauthenticated SMTP forwarding endpoint stays disabled. Email delivery is now provided by an authenticated server endpoint; see `docs/INVITATION_EMAIL.md`.

## Testing

After extracting the generated full source folder:

```sh
node --test test/invite.test.js extensions/themba-v17/tests/*.test.js
node --check scripts/auth.js
node --check scripts/live-data.js
node --check src/server.js
npm install
npm test
```

The prior server replacement removed existing demo endpoints, the Safe proxy mount and the testable app export. Those routes and the app export have now been restored from repository history. The unauthenticated email relay remains disabled. Browser bundles were rebuilt. `npm test`: 29 tests passed, 0 failed. These tests include mocked invite redemption, real local HTTP routes, and a mocked Safe upstream; they do not verify live Supabase membership writes.

## Must verify against a real Supabase project

The repository does not ship SQL migrations/definitions for the `accept_invite` and `invite_member` RPC functions. Check that `accept_invite(p_token)` exists, accepts the authenticated user's email identity, inserts membership keyed by the **existing user ID**, handles repeat accepts idempotently, enforces expiry/invite email/group access, and supports one user belonging to multiple stokvels. Also verify RLS for group data and confirm that no unauthenticated user can grant themselves membership. Do **not** deploy real-money features before the database and authorization tests pass.

## Test cases before launch

1. Existing signed-out member invited to second stokvel: sign in, retain original membership, see both groups.
2. Existing signed-in member opens a valid invitation: accept using same user ID.
3. Fresh email signup, email verification and first login: join exactly once.
4. Expired/wrong-email/already-accepted invites: clear feedback and safe retries.
5. Non-treasurer cannot create an invitation for any stokvel.
6. No hidden duplicate `send-invite` requests and no public email relay.
7. Concurrent invitation redemptions, network errors, logout/login, browser refresh.

Do not put Supabase service-role credentials or API secrets into frontend files or the ZIP.

## Additional fixes in this complete ZIP

- Signed-in users following legacy signup invitation links reuse their existing account.
- Signup confirmation carries a saved invitation even when the input is blank.
- Legacy /login.html and /signup.html redirects preserve invitation query parameters.
- Signup links safely encode invitation tokens.
