# Cloudflare transition implementation ledger

Baseline: main 7a083b406ee7988a4eb63742a68617bcc7f4c6dc (V5.10).
User direction: Cloudflare only; retire Netlify after preserving progress; account/password without email; improve the existing flower game.

## Decisions
- Deliver Cloudflare-native accounts and versioned saves first, keeping the existing Canvas gameplay and explicit legacy access. Original implementation used native PBKDF2-SHA256 600000 iterations (superseded by the production-runtime hotfix below), random salt, HttpOnly Secure SameSite=Strict cookies, hashed session/recovery tokens, credential-version revocation and database-backed rate limits.
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


## 2026-10-18 user-directed email and combat revision
- New registration now requires an email-format login identifier plus password, without ownership verification or any outgoing email. The existing username column is reused, avoiding an unnecessary schema/data migration. Canonical comparison trims, normalizes and lowercases, while preserving plus tags and dots. Existing preview game-name accounts retain password login and recovery.
- The existing 256-bit recovery code remains the non-email recovery credential; using it changes the password, revokes old sessions and rotates the code. Email limits cannot block this normal account path; API abuse limits remain enforced and return Retry-After. An email is an unverified identifier, so matching a legacy email alone never claims its old save.
- Florr-direction gameplay entered this batch: H/touch orbit reversal, guard durability repair after both the body and petal remain unhit for 1.2s (6% max durability/s, intact petals only), slot durability/reload countdown and actual reload-duration progress. These are original balance choices, not claims about Florr's exact mechanics. Orbit direction and combat durability remain transient simulation state.
- Mobile screenshot inspection found the pre-existing shrink-to-fit slot area wrapping over combat buttons. Portrait slots now fill the viewport in one row, with a browser overlap assertion. HUD uses the email local part (capped at 18 characters), keeping internal IDs/full addresses out of the main game badge.
- Email acceptance tests and combat unit tests were first observed failing, then passed after implementation. Current full suite: 17 CJS scripts and 10 API tests; real local workerd/D1 browser 28/28. Old browser groups are recorded separately in QA.
- Netlify visitor access was changed through its connector from non-production-only protection to team-login protection on ALL deploys. An anonymous browser at the old production URL now redirects to Team protection and visibly reports "This site is private". This retires public game service while retaining recoverable history. It does not delete the site or unlink its repository. The build-stop tombstone remains.
- Netlify dashboard login through Google reached device approval, then failed at the provider callback with "Invalid state key". A fresh project page remained unauthenticated. Remote permanent deletion/unlink remains blocked by dashboard access; no account deletion or data purge was attempted.
- GitHub/main production remains V5.10 until this revised preview is accepted; do not promote based on the old preview URL or the prior 98-check count.

- Final revised browser regression: Cloudflare 28, local accounts 32, gameplay 28, smoke 10, mocked legacy cloud 7; all 105 passed. Worker compilation passed. Preview publication follows; production signup, owner migration and permanent Netlify removal remain separately gated.


## Production-runtime registration failure and root-cause fix
- User's revised preview registration returned the generic 503 message. Preview D1 had 0 players/sessions/saves with rate buckets present; production D1 also had 0 native players/saves. No account or save was deleted or rewritten.
- A temporary same-account Worker, with the same compatibility date and nodejs_compat, reproduced native pbkdf2(600000) throwing NotSupportedError: "Pbkdf2 failed: iteration counts above 100000 are not supported (requested 600000)." Native 100000 succeeded. Official workerd PR #7550 explains that the open-source runtime overrides this enforcement, while deployed Workers inherit it. This corrects the inference from earlier local workerd acceptance.
- Selected native scrypt at N=16384,r=8,p=5,maxmem=32MiB, a documented OWASP 16MiB profile, rather than silently reducing PBKDF2 protection. The exact fixed public vector returned 964969a05a3b287285cf7576af1ffcdc6bc82f271132dcc5915c14dd7bea6767 on both deployed Worker and Node.
- A regression mocks the real PBKDF2 ceiling at the native module boundary. It reproduced registration failing 503 before the fix, then exercises registration, existing/missing-account login, password change and recovery. Another case ensures old PBKDF2 records retain recovery access.
- Health now checks both D1 and a cached fixed scrypt vector; the crypto result must be verified on the exact new Pages deployment before asking the user to retry. No test signup or user credentials are involved in this health probe.
- Current static/API suite and Worker compile passed: 17 static scripts and 12 API cases. Fresh browser runtime acceptance and revised preview deployment are subsequent gates. The previously reported 105 browser checks belong to the pre-hotfix tree.
- References: https://github.com/cloudflare/workerd/pull/7550 ; https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/ ; https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt .
