# Forma Studio credentials and environment setup

This file documents the environment values used by the app. Enter secret values only in a local `.env` file or your hosting provider's encrypted environment/secrets settings. Do not paste secret values into chat, issue trackers, screenshots, frontend code, or source control.

## Supabase project: `formastudio`

Open the `formastudio` project in Supabase and copy the values from **Connect** and **Settings → API Keys**. The project display name is not the Project URL.

| Variable | What to enter | Where to find it | Required handling |
| --- | --- | --- | --- |
| `SUPABASE_URL` | Project root, usually `https://<project-ref>.supabase.co` | Project **Connect** dialog or **Settings → API Keys** | Do not append `/rest/v1`, `/storage/v1`, a table name, or a query string. |
| `SUPABASE_SECRET_KEY` | Modern server Secret key beginning `sb_secret_` | **Settings → API Keys → Secret keys** | Recommended. Server-side only. Never use the publishable key here. |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy service-role JWT, usually `eyJ…` with role claim `service_role` | **Settings → API Keys → Legacy API keys**, if available | Alternative to `SUPABASE_SECRET_KEY`, not an additional value. |
| `SUPABASE_PUBLISHABLE_KEY` | Modern publishable key beginning `sb_publishable_` | **Settings → API Keys → Publishable keys** | Used by the backend to call Supabase Auth. It is never rendered into Forma Studio's UI. |
| `SUPABASE_ANON_KEY` | Legacy anon JWT, usually `eyJ…` with role claim `anon` | **Settings → API Keys → Legacy API keys**, if available | Alternative to `SUPABASE_PUBLISHABLE_KEY`, not an additional value. |

Set exactly one key in each pair: one server key and one Auth key. Recommended:

```dotenv
SUPABASE_URL=https://<your-actual-project-ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_<your-server-secret>
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-publishable-key>
SUPABASE_ANON_KEY=
```

Replace placeholders with the exact project values. Do not include angle brackets in actual values. Do not put a publishable/anon key in the server-key variable or a server secret in the Auth-key variable. Server secret/service-role credentials bypass Row Level Security and must remain on the server.

### Accounts

| Variable | Purpose | Rules |
| --- | --- | --- |
| `ADMIN_USERNAME` | Studio administrator's username | Defaults to `studioadmin`. |
| `ADMIN_PASSWORD` | Studio administrator's password | Local default only; replace with a unique password of at least 14 characters before seeding a hosted account. |
| `ADMIN_EMAIL` | Email identity used by Supabase Auth | Must be a real address, unique from `CLIENT_EMAIL`. |
| `ADMIN_DISPLAY_NAME` | Name shown in the workspace | Defaults to `Avery Chen`; replace as appropriate. |
| `CLIENT_USERNAME` | Client user's username | Defaults to `client`. |
| `CLIENT_PASSWORD` | Client user's password | Local default only; replace with a unique password of at least 14 characters before seeding a hosted account. |
| `CLIENT_EMAIL` | Email identity used by Supabase Auth | Must be a real address, unique from `ADMIN_EMAIL`. |
| `CLIENT_DISPLAY_NAME` | Name shown in the workspace | Defaults to `Jordan Lee`; replace as appropriate. |

`python scripts/seed_accounts.py` creates or updates both accounts in Supabase Auth and links their user IDs to `public.app_users`. It requires the Project URL, one server key, one Auth key, two real distinct emails, and unique passwords. Supabase Auth validates account passwords; the persistent `app_users` profile table does not store password hashes.

### Email verification

No email API key is required by Forma Studio. The app calls Supabase Auth to send and verify email OTP codes for email-restricted brand kits and Legal Kit access requests.

1. Open **Authentication → Email Templates → Magic Link**.
2. Ensure the email template includes `{{ .Token }}` so Supabase sends a six-digit code, rather than only a clickable link.
3. Confirm the Auth email provider is enabled and test a code on an approved email address.
4. For production, configure a suitable SMTP server in Supabase Auth settings; the built-in sender has testing limits.

## Other variables

| Variable | Purpose | Guidance |
| --- | --- | --- |
| `SESSION_SECRET` | Signs the app's HTTP-only session cookie | Generate a random value with at least 32 characters. Example: `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Production startup rejects the placeholder. |
| `APP_NAME` | Product name displayed in the UI | Defaults to `Forma Studio`. |
| `APP_ENV` | Runtime mode | Use `development` locally and `production` on the host. |
| `GEMINI_API_KEY` | Brand copy, tagline, and elevator-pitch generation | Use an API key from Google AI Studio with the Gemini API enabled. Server-side only; required in production. |
| `GEMINI_MODEL` | Gemini model identifier | Defaults to `gemini-3.6-flash`; use a model supported by the API key. |
| `QLOO_API_KEY` | Optional cultural insights | Use the Qloo-issued key provisioned for this app/environment. Server-side only. |
| `QLOO_BASE_URL` | Qloo API host root | Defaults to `https://hackathon.api.qloo.com`; use the exact host associated with the key. Do not append an endpoint path. |

## Environment template

Copy `.env.example` to `.env` and replace all local/default values before connecting a hosted account. Example local-only configuration:

```dotenv
APP_NAME=Forma Studio
APP_ENV=development
SESSION_SECRET=replace-with-a-unique-random-value-of-at-least-32-characters

ADMIN_USERNAME=studioadmin
ADMIN_PASSWORD=FormaAdmin!2026
ADMIN_EMAIL=avery.chen@example.test
ADMIN_DISPLAY_NAME=Avery Chen
CLIENT_USERNAME=client
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

The local-only sample email domains above must be replaced by real, distinct addresses before account seeding. Do not run local defaults in a public or production environment.

## Deployment checklist

- [ ] Confirm the dashboard belongs to the `formastudio` project and copy its exact Project URL.
- [ ] Configure exactly one server key and one Auth key using the correct variable names.
- [ ] Apply `schema.sql` to a fresh database, or apply the ordered migrations to an existing Forma Studio schema.
- [ ] Set unique account emails and passwords, then run `python scripts/seed_accounts.py`.
- [ ] Set a fresh `SESSION_SECRET` in the host's secret manager.
- [ ] Configure `GEMINI_API_KEY` and test tagline and elevator-pitch generation.
- [ ] If using Qloo, test with the exact API host provisioned for that key.
- [ ] Configure the Supabase Auth Magic Link template to use `{{ .Token }}` and configure SMTP for production email.
- [ ] Sign in as both roles, save a kit, restart the app, and confirm the saved kit persists.
- [ ] Rotate any credential that was committed or exposed; updating `.env` alone does not revoke an exposed key.
