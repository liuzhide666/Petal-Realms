# Cloudflare Accounts and Saves Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. This release is the account/storage milestone of the broader game roadmap.

**Goal:** Register/login with a game account and password without email, store progress on Cloudflare, and preserve legacy roles while retiring Netlify.

**Architecture:** Retain the Canvas game and current Pages origin. Add Pages Functions and separate production/preview D1 databases. Keep Supabase only as an explicit legacy migration/presence path until owners have migrated.

**Tech Stack:** JavaScript, native node:crypto, Pages Functions, D1, Node 24 tests, Wrangler 4.151.1, Python Playwright 1.58.0.

**Spec:** ../../CLOUDFLARE_PAGES.md; user-approved conversation roadmap; ../../CF_IMPLEMENTATION_LEDGER.md.

## Global Constraints
- No email is required for native game accounts.
- Preserve old local accounts, saves and the shared Supabase project's other applications.
- No identity bypass on email or API rate limits; never trust a caller-supplied owner as authorization.
- A stale save cannot overwrite a new revision; back up before explicit conflict resolution/import.
- Keep preview and production data isolated; test data never uses production accounts.
- Do not claim Netlify retirement from local configuration changes alone.

## Review Focus
- Shared-cookie account changes in other tabs: compare expected identity with authenticated identity on every account-bound route.
- Concurrent local outbox writers: one browser lock per account and no revision borrowing.
- Corrupt local storage: recovery targets the verified account and can export opaque raw data.
- Interrupted migration: atomic legacy link/save transaction and no overwrite of existing target progress.
- Password/recovery lifecycle: old sessions revoked, one-use recovery code paired with the correct immutable username.

## Tasks
- [x] Add private D1 schema, secure server account/session/recovery and persistent rate limiting. Files: functions/api/[[path]].js, database/cloudflare/0001_accounts.sql. Tests: tests/cloudflare_api.test.mjs.
- [x] Integrate default Cloudflare login, local pending saves, revision conflict controls, backup/import/rollback and explicit migrations. Files: site/index.html. Tests: tests/v511_wiring.cjs, tests/browser_v511.py.
- [x] Preserve explicit local and legacy cloud entry and old gameplay behavior. Tests: browser_v510.py, browser_v59.py, browser_smoke.py, browser_cloud_auth.py plus existing CJS suite.
- [x] Provision separate new D1 databases and additive schema; no legacy payloads moved or deleted.
- [x] Remove old manual Netlify publishing script and rewrite deployment docs; retain build-stop protection until remote unlink.
- [x] Independent branch review; reproduce four material findings RED, fix them, verify GREEN. Tests: tests/v511_review.cjs and cross-tab API regression.
- [ ] Final whole-suite/Worker build evidence; publish feature branch/PR and verify CI.
- [ ] Verify Cloudflare preview identity, D1 binding, secure session, native crypto quota behavior; only then promote.
- [ ] Verify production SHA and health after promotion.
- [ ] Real legacy-owner migration and remote Netlify unlink/delete after data migration acceptance.

## Subsequent Game Milestones

Battle feel/mobile controls/performance, equipment and crafting balance, biome ecology and exploration, then authoritative cooperative rooms on Durable Objects. These are subsequent independently testable milestones; account migration is not a claim that these gameplay changes are already shipped.
