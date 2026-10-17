# Petal Realms V5.8 — Address + Password, no confirmation email

**Project:** `bfipozjqhzsbdvmisoct` | **Production:** https://petal-realms.pages.dev | **GitHub:** `liuzhide666/Petal-Realms`

## Required one-time Supabase dashboard configuration

1. Open https://supabase.com/dashboard/project/bfipozjqhzsbdvmisoct/auth/providers.
2. Open the **Email** authentication provider. Keep Email login and new-user signups **enabled**.
3. Switch **Confirm Email** to **OFF** and save. This is a **project-wide** setting: when OFF, an email-format address is accepted without proving ownership; new signups immediately receive an Auth session and no confirmation email is required.
4. Open https://supabase.com/dashboard/project/bfipozjqhzsbdvmisoct/auth/url-configuration and check that the primary Site URL is `https://petal-realms.pages.dev` (consider other applications sharing this Supabase project before changing it).
5. Return to https://petal-realms.pages.dev and use a **new, reserved test account address** to register with a strong password. Expect to enter the game immediately—**not** to receive confirmation email.
6. Test existing account address/password sign-in, sign-out, session restore, settings → password change using the old password, and cloud save recoveries on a second browser/device.
7. Confirm the Auth configuration via read-only **GET `/auth/v1/settings`**. The publicly returned `autoconfirm` flag (or `mailer_autoconfirm` on some GoTrue versions) should be `true`. The game *refuses to call* `/auth/v1/signup` when the flag cannot be verified as enabled, to avoid sending a confirmation email.

**This connector currently cannot change Supabase Auth settings.** An updated webpage on Cloudflare is insufficient until this dashboard toggle is actually changed. Never use SQL updates against `auth.users` or disable RLS to bypass email confirmation.

## User-facing behavior

- The form still uses an **email-format account address** as the Supabase Auth identifier plus a password. No confirmation code or link is needed after Confirm Email is disabled.
- Email-dependent **Forgot Password** is not offered, and the client no longer initiates `/auth/v1/recover`.
- Already-received password recovery links from older versions remain accepted by the existing callback parser for backwards compatibility; this does not initiate an outgoing message.
- Logged-in cloud players can change passwords in **Settings** by re-entering the old password first. This contacts Supabase Auth over HTTPS; no password is put in the game save.
- Session refresh, one-user-one-save RLS, outbox conflict detection, offline backup, legacy local account switching, gear and gameplay remain untouched.
- **Loss of account password may mean permanent account loss.** There is no guaranteed no-email self-service recovery. Back up progress and keep a securely stored password.
- By disabling email confirmation, a user can register an address **they do not control**; it cannot establish true ownership. For public competitive play or account recovery, move to an authenticated username/passkey or verified-email architecture with proper rate limits and identity controls.
- Password changes or security alerts configured separately within Supabase may still generate email independently. This release eliminates confirmation/recovery sending from the game **client**, not every optional server notification in a shared project.

## Release gates

- GitHub Actions: syntax and Cloud Save, Auth messaging, talents, tactical AI, Realtime mock, Cloudflare and no-mail mode tests.
- Supabase public settings preflight tests: disabled / unknown / offline config must not POST signup; enabled config returns a session and launches the game.
- Password change checks: old password validated via the Auth API before updating a new password.
- Cloudflare Pages Production commit hash equals GitHub `main`; do not confuse previews with production.
- **Real new-account no-email login** cannot be claimed successful until Supabase settings are toggled and a test account is registered.

Official documentation:
- https://supabase.com/docs/guides/auth/general-configuration
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/rate-limits

## Rollback

GitHub revert to V5.7.2 changes client logic; it will not revert Supabase configuration or any accounts automatically. Preserve the cloud table `public.petal_realms_saves`, existing user IDs, login addresses, localStorage and previous Cloudflare production deployments for recovery.
