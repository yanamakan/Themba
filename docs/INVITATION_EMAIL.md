# Invitation email delivery

The existing invitation system is unchanged: Supabase's `invite_member` RPC still creates the token,
`login.html?invite=<token>` still carries it, and `accept_invite` still joins the user. This adds one
step: the invitation is now **emailed** to the recipient instead of the treasurer having to share a link.

## Flow

1. The treasurer enters the recipient's email (Invite Member modal on the members dashboard, or
   *Approvals → Signers & invites → Invite a member* on the treasurer dashboard).
2. The browser calls `ThembaAPI.sendInvitation()`, which sends the treasurer's Supabase session token to
   `POST /api/invitations/email`.
3. The server verifies that session with Supabase Auth, then calls `invite_member` **as that user**
   (their JWT and the public anon key). Supabase checks the caller may invite to that stokvel and creates the token.
4. The server emails the recipient a personalised invitation (inviter name, stokvel name, a **Join** button,
   a "create account" link, expiry and the invited email address).
5. The recipient opens the link, signs in or signs up, and the existing flow accepts the invitation.

If email is not configured, unreachable (e.g. static hosting) or fails after the invite is created, the treasurer
gets the private link to share manually, exactly as before. Real errors (not allowed, bad email, rate limit) are shown as errors.

## Setup

1. `npm ci` (nodemailer is already a dependency).
2. Copy `.env.example` to `.env` and set `APP_BASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.
3. Verify the sending domain with your email provider (SPF and DKIM, ideally DMARC), or invitations will land in spam.
4. In Supabase → Authentication → URL Configuration, make sure `APP_BASE_URL` (and `/dashboards/login.html` on it)
   is in the allowed redirect URLs. New users' confirmation emails return there with the invitation attached.
5. `npm start`. The console prints `Invitation email: enabled` or lists what is missing.

The server needs no service-role key. `SUPABASE_URL` / `SUPABASE_ANON_KEY` default to `scripts/config.js`.

## Security design

- **No open relay.** The endpoint requires a valid Supabase session and only emails an invitation that
  `invite_member` has just created for that caller. The recipient address is the only free-text input; the message is a fixed template.
- **Authorisation stays in the database.** The RPC runs with the caller's JWT, so existing role checks apply. The server adds none of its own.
- **Link cannot be forged.** The link is built from `APP_BASE_URL`, never from the request's Host header.
- **Escaping.** Names are HTML-escaped and stripped of line breaks (no markup or header injection).
- **Throttling.** Per user (30/hour) and per recipient per stokvel (3/hour), in memory. Use a shared store if you run several server instances.
- **Secrets** (SMTP credentials) live only in `.env` on the server. The invitation token is never logged or returned to the browser when email succeeds.
- The old unauthenticated `/api/send-invite` stays disabled (503).

## Tests

`node --test test/invitation-email.test.js` runs with fakes for Supabase and the mail transport:
authentication, validation, permission denial, escaping, rate limits, SMTP failure and the browser fallback.

## Not verified here

- Delivery through a real SMTP provider.
- `invite_member` / `accept_invite` against a real Supabase project. Their SQL is not in this repository; this
  assumes `invite_member` returns the token (as the existing client already expects) and authorises with `auth.uid()`.
- Test end to end: invite an existing user, a brand-new user, a wrong-email signup and an expired invitation.
