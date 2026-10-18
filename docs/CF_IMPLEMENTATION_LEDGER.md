# Cloudflare transition implementation ledger

Baseline: main 7a083b406ee7988a4eb63742a68617bcc7f4c6dc (V5.10).
User direction: Cloudflare only; retire Netlify after preserving progress; account/password without email; improve the existing flower game.

## Decisions
- Deliver Cloudflare-native accounts and versioned saves first, keeping the existing Canvas gameplay and explicit legacy access. Server authentication uses native Node crypto PBKDF2-SHA256 600000 iterations, random salt, HttpOnly Secure SameSite=Strict cookies, hashed session/recovery tokens, credential-version revocation and database-backed rate limits.
- Keep existing local accounts and Supabase records untouched. Import requires an explicit action; cloud migration verifies the old access token and fetches its RLS-protected save server-side. Existing target saves are never overwritten by migration.
- Production and preview use separate new D1 databases. No other Supabase application or project-level setting is changed.
- Retain the Netlify build-stop tombstone until the remote site is actually unlinked/retired. Removing the ignore configuration before unlinking could restart unwanted builds. Remove the old manual deployment script now.
- Full multiplayer and broad gameplay/content work remain subsequent milestones, not claims of this account/storage release.

## Evidence
- Governing engineering source restored and preflighted: universal-code-engineering 1.2.8.
- API tests first failed because the API module did not exist, then passed on Node+SQLite. UI wiring first failed because Cloudflare authentication was not connected, then passed after integration.
- Real local workerd/D1 browser acceptance: 19/19. Covers two independent contexts, revision conflict, explicit cloud resolution, password revocation, recovery-code rotation, local-to-cloud migration and no mail requests.
- Native PBKDF2 600000 verified in local workerd, not inferred from Node alone.
- Prior local-account browser regression: 32/32 after explicitly choosing the retained local account mode.
- Production/preview D1 databases provisioned; additive initial schema applied. No legacy player payload copied or deleted.
- This host cannot enumerate network interfaces; local workerd used a test-only loopback inventory fallback, outside repository code. Server and browser tests run as children of one harness because shell calls have separate network namespaces. Neither adaptation is used in production or required in CI.

## Pending release gates
- Run complete current suite and compile Worker after final edits.
- Independent review, fix material findings, rerun affected tests.
- Preview deployment, verify API/secure cookie/CPU behavior on Cloudflare.
- Merge only after CI success; verify production SHA and read-only health.
- Real old Supabase user migration requires its owner's login; no credentials are available here.
- Netlify connector exposes no site deletion or repository unlink operation; remote retirement is not completed by this patch.

## Independent review and fix pass
- Reviewer identified four material findings: shared-cookie account switch could redirect saves; a stale tab could adopt a newer shared outbox revision; corrupt outbox recovery retained the prior target ID; recovery download could label its code with an unrelated username.
- All four were reproduced as failing regressions before fixes. Account-bound requests now assert X-Petal-Account against the authenticated cookie identity, and save reads echo the verified ID. Same-origin concurrent writers use a browser Web Lock held for the active character; unsupported browsers retain the local-account option. Each queued snapshot keeps its own loaded revision; acknowledgements do not clear a changed outbox. Recovery establishes the verified target before parsing local data and binds resolution to it. Recovery-card downloads capture the response account immutably.
- Ruling: one active writer per account within one browser origin; independent devices still use server CAS. This avoids pretending localStorage is a transaction or silently adopting another tab's version. Cost: a second same-browser tab must first close/log out the existing character; old browsers without Web Locks use local mode.
- Added explicit regressions for the four findings plus a real-browser same-origin second-tab check. No second reviewer dispatch; the fix pass is verified by RED/GREEN tests and the complete suite.

## Final local verification
- Final full Node suite: 16 CJS scripts (including the three review reproductions) and 9 API tests passed after the fix pass.
- Worker build with explicit compatibility date and nodejs_compat compiled successfully without the previous compatibility warning.
- Fresh local workerd/D1 browser: 21/21; retained local mode 32/32; gameplay UI 28/28; smoke 10/10; mocked legacy cloud 7/7. Browser checks total 98; this is not a production migration claim.
- A source-slicing legacy test initially captured the new diagnostic listener; moving diagnostic registration after the existing public snapshot boundary preserved behavior and restored the full suite.
- Current host Python changed to 3.12; pinned Playwright 1.58.0 restored to the task's reusable test runtime and the final browser checks rerun.
- Pages configuration updated to Node 24, npm test build gate, explicit compatibility flags and separate D1 bindings; existing production remained on V5.10 during preparation.
