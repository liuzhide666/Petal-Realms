# Petal Realms V5.3 QA — 2026-10-17

## Evidence

- JS syntax and secret pattern check: PASS.
- Cloud mock-API unit tests: **18/18 PASS**, including first insert, CAS update, token refresh, offline pending snapshot persistence, reload with unchanged baseline, newer-snapshot-not-lost during in-flight failures, retry, conflict protection and public client key.
- Chromium desktop/mobile UI smoke: **10/10 PASS**, including visible login, cloud mode switch, guest game start, 27 flowers/petals and no runtime exceptions.
- Chromium form with mocked auth/REST endpoints and synthetic localStorage: **7/7 PASS**; loaded saved level 9 with 7 slots, relogged into pending level 16, replay cleared outbox, stale baseline denied without deleting local backup, no runtime JS error. The browser environment blocks local file navigation and native storage on about:blank; this was not a real HTTPS origin.
- Data side: Supabase table and RLS previously created, project checked healthy; no real player Auth account, data write, or device-to-device flow tested. There are no game records (0 at last inspection).
- Netlify: existing site identified and production deploy checked READY; this artifact has NOT been deployed. Tool access presently lacks deploy-upload action.
- GitHub: app access verified, but only Windesk visible; no dedicated game repo yet. No commit done.

## Release gates not passed

1. Confirm Supabase Auth Site URL, redirect URLs, email confirmation, real user registration and login.
2. Real Supabase `GET`/`POST`/`PATCH` authenticated with an owned disposable test user, and RLS negative access test.
3. Real iOS Safari and Android long-play, persistence across reload, offline/online with dual-device conflict.
4. Deploy candidate to Netlify **draft preview**, verify visual + cloud auth; only then publish to same existing site.
5. Connect a dedicated GitHub repo and verify preview/production build rules.

## Explicit nonclaims

This is an integration candidate, **not** a verified production release and **not** a completed three-platform sync.
