# Forma Studio credentials and environment setup

Keep secret values in a local `.env` file or your hosting provider's encrypted environment settings. Do not paste secrets into chat, issue trackers, screenshots, frontend code, or source control.

## 1. Application login accounts

Forma Studio's visible username/password login is **app-managed**. The application validates the configured usernames and passwords on the server. It does not use Supabase Auth to validate these credentials and does not query Supabase Postgres as part of login or session-user resolution. The login form stays the only visible login UI; Supabase Auth login UI/backend sign-in placeholders remain commented out.

| Variable | Purpose | Notes |
| --- | --- | --- |
| `ADMIN_USERNAME` | Administrator username | Defaults to `studioadmin`. |
| `ADMIN_PASSWORD` | Administrator password | Local example only; use a unique password in a hosted environment. |
| `ADMIN_USER_ID` | Administrator's workspace profile UUID | Defaults to the Forma Studio profile ID in `app/accounts.py`. Must match `public.app_users.id`. |
| `ADMIN_EMAIL` | Profile/contact email for the administrator | Use a real address for hosted use and Legal Kit features. |
| `ADMIN_DISPLAY_NAME` | Name shown in the workspace | Defaults to `Avery Chen`; replace as appropriate. |
| `CLIENT_USERNAME` | Client username | Defaults to `client`. |
| `CLIENT_PASSWORD` | Client password | Local example only; use a unique password in a hosted environment. |
| `CLIENT_USER_ID` | Client's workspace profile UUID | Defaults to the Forma Studio profile ID in `app/accounts.py`. Must match `public.app_users.id`. |
| `CLIENT_EMAIL` | Profile/contact email for the client | Use a real address for hosted use and Legal Kit features. |
| `CLIENT_DISPLAY_NAME` | Name shown in the workspace | Defaults to `Jordan Lee`; replace as appropriate. |

The known local credentials are:

| Role | Username | Local example password |
| --- | --- | --- |
| Admin | `studioadmin` | `FormaAdmin!2026` |
| Client | `client` | `FormaClient!2026` |

Do not keep these example passwords on a public production deployment. The application password values are environment settings; they are not Supabase Auth passwords and are not stored in `app_users`.

Run `python scripts/seed_accounts.py` after configuring the Supabase database. The script creates or updates workspace profile rows and Legal Kit entries; it does **not** create Supabase Auth users and does not read, store, or modify application passwords. If it reports that an existing username has a different profile UUID, set `ADMIN_USER_ID` or `CLIENT_USER_ID` to the reported existing UUID in both local environment and hosting settings, then rerun. This prevents workspace records from being reassigned accidentally.

## 2. Supabase Postgres and Storage

Open the `formastudio` project in Supabase and copy the Project URL from **Connect** or **Settings → API Keys**. The display name is not the URL.

| Variable | What to enter | Where to find it |
| --- | --- | --- |
| `SUPABASE_URL` | Project root such as `https://<project-ref>.supabase.co` | Project **Connect** dialog or **Settings → API Keys** |
| `SUPABASE_SECRET_KEY` | Server Secret key beginning `sb_secret_` | **Settings → API Keys → Secret keys** |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy service-role JWT, generally `eyJ…` | Alternative only if using a legacy key; do not set alongside `SUPABASE_SECRET_KEY` |

Set `SUPABASE_URL` and exactly one server key for persistent workspace data. Do not append `/rest/v1`, `/storage/v1`, a table name, query string, or endpoint path to the Project URL. A Secret/service-role key is server-only and has elevated access; never place it in browser code.

Example:

```dotenv
SUPABASE_URL=https://<your-actual-project-ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_<your-server-secret>
SUPABASE_SERVICE_ROLE_KEY=
```

Replace placeholders with actual values; do not include angle brackets.

## 3. Optional Supabase Auth for email OTP only

Supabase Auth is **not used for the admin/client login**. The key below is optional and only enables six-digit email verification for email-restricted brand kits and Legal Kit access requests. If it is absent, Forma Studio still starts and app users can still sign in; email OTP routes report that verification is unavailable.

| Variable | What to enter | Where to find it |
| --- | --- | --- |
| `SUPABASE_PUBLISHABLE_KEY` | Modern key beginning `sb_publishable_` | **Settings → API Keys → Publishable keys** |
| `SUPABASE_ANON_KEY` | Legacy anon JWT with role claim `anon` | Alternative to publishable key, if using a legacy key |

Set at most one of these optional values. Never put the server Secret key into either variable.

If enabling email OTP:

1. Open **Authentication → Email Templates → Magic Link**.
2. Ensure the template includes `{{ .Token }}` so it delivers a six-digit code.
3. Verify email delivery and configure SMTP in Supabase Auth settings for production use.

The commented-out Supabase Auth sign-in placeholder is not rendered and is not called by the application login route.

## 4. Other variables

| Variable | Purpose | Guidance |
| --- | --- | --- |
| `SESSION_SECRET` | Signs the app's HTTP-only session cookie | Use a random value of at least 32 characters. Generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. |
| `APP_NAME` | Product name | Defaults to `Forma Studio`. |
| `APP_ENV` | Runtime mode | Use `development` locally and `production` on the host. |
| `GEMINI_API_KEY` | Brand copy, tagline, elevator-pitch generation | Server-side only; required for production. |
| `GEMINI_MODEL` | Gemini model identifier | Defaults to `gemini-3.6-flash`; use a model supported by the key. |
| `QLOO_API_KEY` | Optional cultural insights | Server-side only. |
| `QLOO_BASE_URL` | Qloo API root | Defaults to `https://hackathon.api.qloo.com`; do not append an endpoint path. |

## 5. Local environment example

Copy `.env.example` to `.env`; replace local/default values before public deployment.

```dotenv
APP_NAME=Forma Studio
APP_ENV=development
SESSION_SECRET=replace-with-a-unique-random-value-of-at-least-32-characters

ADMIN_USERNAME=studioadmin
ADMIN_USER_ID=210ad331-4a00-55f4-af5b-28c4e441a799
ADMIN_PASSWORD=FormaAdmin!2026
ADMIN_EMAIL=avery.chen@example.test
ADMIN_DISPLAY_NAME=Avery Chen
CLIENT_USERNAME=client
CLIENT_USER_ID=c5105d08-bd79-5d64-b813-754d7bb9f95f
CLIENT_PASSWORD=FormaClient!2026
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

- [ ] Configure the actual `formastudio` Project URL and exactly one server key.
- [ ] Run `schema.sql` in Supabase; for a new install, the legacy `20261018_supabase_auth.sql` is not required.
- [ ] Set real profile email addresses and run `python scripts/seed_accounts.py` to provision the Postgres profile rows.
- [ ] Configure unique app usernames/passwords in the application environment; these are independent of Supabase Auth.
- [ ] Set a fresh `SESSION_SECRET` in the host's secret settings.
- [ ] Configure `GEMINI_API_KEY` and test tagline and elevator-pitch generation.
- [ ] Only if email OTP is needed, configure one optional Auth key and verify the Supabase email template and SMTP.
- [ ] If using Qloo, verify its API key and endpoint.
- [ ] Sign in as both roles, save a brand kit, and confirm the data persists across server restarts.
- [ ] Rotate credentials that have been committed or exposed; changing `.env` does not revoke a leaked key.
