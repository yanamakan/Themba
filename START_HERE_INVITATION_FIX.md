# Complete Yana JavaScript source — invitation fix

Extract this entire folder, then run:

```sh
npm ci
npm test
npm start
```

Open http://localhost:3000. Node.js 20+ is required.

This is the complete source, not a downloader kit. Source: yanamakan/Themba Yana at 549f2d2f5b9570196844902402320742fd31a300. No GitHub changes were pushed.

Existing members use invitation login links and their current account. New users can sign up. Invitations are now emailed automatically once SMTP is configured (see docs/INVITATION_EMAIL.md and .env.example); without it, treasurers get a private link to share manually.

Validation: npm ci, npm test (29 passing), rebuilt dashboard/Safe bundles, auth/live-data/server syntax checks. See docs/TEST_RESULTS.txt and docs/INVITATION_FIXES.md. Live Supabase invitation functions and email confirmation were not tested with real accounts; their SQL definitions are absent from this repository. Demo API data remains demo data.
