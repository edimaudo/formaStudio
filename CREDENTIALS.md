# Forma Studio credentials and environment setup

Keep secret values in a local `.env` file or your hosting provider's encrypted environment settings. Do not paste secrets into chat, issue trackers, screenshots, frontend code, or source control.

## 1. Application login accounts

Forma Studio's username/password login is handled locally by the application. It does not use Supabase Auth, query Supabase database tables, or require login credentials to be added to Vercel.

| Role | Username | Application password |
| --- | --- | --- |
| Admin | `studioadmin` | `FormaAdmin!2026` |
| Client | `client` | `FormaClient!2026` |

These fixed credentials are for controlled evaluation only. Anyone who knows them can sign in. Do not use them on a publicly exposed service holding sensitive client information. The app's signed session requires a unique `SESSION_SECRET`, which is separate from the usernames and passwords.

## 2. Supabase workspace data (not login)

Supabase is used for saved brand kits, uploaded assets, and Legal Kit records. Workspace owner IDs are stable application data identifiers, separate from the login flow. The `ADMIN_USER_ID` and `CLIENT_USER_ID` variables are optional compatibility settings for deployments whose existing saved records use custom owner UUIDs. They are not username/password settings. No `app_users` table, profile seeding, or Supabase Auth user is required for the two application logins.

| Variable | What to enter | Where to find it |
| --- | --- | --- |
| `ADMIN_USER_ID` / `CLIENT_USER_ID` | Optional stable UUIDs for existing workspace ownership; defaults are built into `app/accounts.py` | Keep existing hosting values when upgrading a deployment with saved kits; these are not credentials |
| `ADMIN_EMAIL` / `CLIENT_EMAIL` | Optional contact addresses for email-restricted sharing / Legal Kit flows | Set in local `.env` or hosting settings |
| `SUPABASE_URL` | Project root, e.g. `https://<project-ref>.supabase.co` | Supabase project Connect dialog or **Settings → API Keys** |
| `SUPABASE_SECRET_KEY` | Server Secret key beginning `sb_secret_` | **Settings → API Keys → Secret keys** |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy service-role JWT (generally `eyJ…`) | Use only if using the legacy key, and do not set it alongside `SUPABASE_SECRET_KEY` |

Set the Project URL and exactly one server-only key to enable persistent workspace data. Never put a server Secret/service-role key in browser code.

For a new database, run `schema.sql` in the Supabase SQL Editor. For an existing database, run `migrations/20261021_brand_review_reports.sql` to add the brand-level analysis report, review stage, and change history fields. For a database created by an earlier version of Forma Studio, apply the core-messaging migration if required, then run `migrations/20261019_grant_service_role_access.sql` to grant server access and remove old foreign keys to the legacy `app_users` profile table. This migration does not delete workspace records. You do not need to run a seed script. If the existing deployment uses custom workspace owner UUIDs, preserve its `ADMIN_USER_ID` and `CLIENT_USER_ID` values; these affect record ownership only and never authenticate sign-in.

If Supabase is absent or misconfigured, the local built-in login remains available. The dashboard will show that persistent workspace data is unavailable until the database configuration is corrected.

## 3. Optional Supabase Auth for email OTP only

Supabase Auth is not used for the admin/client login. Its publishable key is optional and only enables six-digit email verification for email-restricted brand kits and Legal Kit access requests.

| Variable | What to enter | Where to find it |
| --- | --- | --- |
| `SUPABASE_PUBLISHABLE_KEY` | Modern key beginning `sb_publishable_` | **Settings → API Keys → Publishable keys** |
| `SUPABASE_ANON_KEY` | Legacy anon JWT with role claim `anon` | Alternative to publishable key, if using a legacy key |

Set at most one optional value. Never put the server Secret key into either variable. If enabling email OTP, configure **Authentication → Email Templates → Magic Link** to include `{{ .Token }}` and set up SMTP in Supabase Auth for production delivery.

The future Supabase Auth sign-in placeholder remains commented out, is not rendered in the UI, and is not called by the login route.

## 4. Other environment variables

| Variable | Purpose | Guidance |
| --- | --- | --- |
| `SESSION_SECRET` | Signs the HTTP-only application session cookie | Use a random value of at least 32 characters. Generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. |
| `APP_NAME` | Product name | Defaults to `Forma Studio`. |
| `APP_ENV` | Runtime mode | Use `development` locally and `production` on the host. |
| `ADMIN_EMAIL` / `CLIENT_EMAIL` | Contact addresses for Legal Kit and restricted-share workflows | Optional; these do not control sign-in. Replace example addresses for real email workflows. |
| `ADMIN_DISPLAY_NAME` / `CLIENT_DISPLAY_NAME` | Display names in the workspace | Optional. |
| `GEMINI_API_KEY` | Brand copy, tagline, elevator pitch | Server-side only. |
| `GEMINI_MODEL` | Gemini model | Defaults to `gemini-3.6-flash`. |
| `QLOO_API_KEY` | Optional cultural insights | Server-side only. |
| `QLOO_BASE_URL` | Qloo API root | Defaults to `https://hackathon.api.qloo.com`. |

## 5. Environment file example

```dotenv
APP_NAME=Forma Studio
APP_ENV=development
SESSION_SECRET=replace-with-a-unique-random-value-of-at-least-32-characters
ADMIN_EMAIL=avery.chen@example.test
ADMIN_DISPLAY_NAME=Avery Chen
CLIENT_EMAIL=jordan.lee@example.test
CLIENT_DISPLAY_NAME=Jordan Lee
SUPABASE_URL=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_ANON_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash
QLOO_API_KEY=
QLOO_BASE_URL=https://hackathon.api.qloo.com
```

## Deployment checklist

- [ ] Set a unique `SESSION_SECRET`.
- [ ] For persistent workspace content, set the correct `formastudio` Project URL and exactly one server-only key. Preserve custom `ADMIN_USER_ID` / `CLIENT_USER_ID` values only if existing records use them.
- [ ] Run `schema.sql` for a new database, or apply the required migrations for an existing database.
- [ ] Confirm both built-in app accounts can sign in even if Supabase persistence is temporarily unavailable.
- [ ] Configure `GEMINI_API_KEY` and test tagline/elevator-pitch generation.
- [ ] Only if email OTP is needed, configure one optional Auth key and verify the email template and SMTP.
- [ ] If using Qloo, verify its API key and endpoint.
- [ ] Sign in as both roles, save a brand kit, and confirm data persists across restarts once Supabase is configured.

Rotate credentials that have been committed or exposed; changing `.env` does not revoke a leaked key.
