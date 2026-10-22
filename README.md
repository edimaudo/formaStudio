# Forma Studio

Forma Studio is a FastAPI brand design workspace for designers, agencies, and in-house brand teams. It brings brand strategy, ten editable brand-kit block types, controlled sharing, AI-assisted copywriting, optional cultural research, and a Legal Kit portal into one workspace.

## Included

- One landing page and one branded username/password login screen shared by the admin and client roles.
- A brand-kit editor with Colors, Typography, Logos, Visuals, Videos, Icons, 3D Models, Collaterals, Resources, and Brand Story blocks.
- Dedicated tagline and elevator-pitch fields with Gemini generation actions and saved, editable output.
- A stable share URL with public, password-protected, or approved-email access.
- A brand-linked Legal Kit that analyzes the selected brand content against GDPR, ISO 27001, and SOC 2 Type II themes. It produces one saved alignment report with framework-specific findings, recommended content changes, a saved content-alignment report. This is a content review, not legal advice, an audit, or a certification.
- Supabase Postgres and private Storage for persistent workspace content. The app-managed username/password login is independent of Supabase Auth and of workspace tables.
- An inert, commented-out Supabase Auth sign-in placeholder. It is not rendered or called. Optional Supabase email OTP is only used for email-restricted share flows, not for the admin/client login.
- Optional Qloo cultural context, accessed server-side.
- Responsive layouts, accessible focus styles, light/dark mode, and Small/Medium/Large type scaling.

## Local setup

Use Python 3.11 or newer.

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # Windows: copy .env.example .env
uvicorn app.main:app --reload
```

## Application login

The built-in application accounts are local app identities. They do not query Supabase, do not use Supabase Auth, and do not need to be provisioned in a database.

| Role | Username | Password |
| --- | --- | --- |
| Admin | `studioadmin` | `FormaAdmin!2026` |
| Client | `client` | `FormaClient!2026` |

These shared passwords are fixed in source for controlled evaluation. Anyone who knows them can sign in; do not expose this setup publicly with sensitive workspace data. Login remains available if Supabase workspace storage is missing or temporarily unavailable. In that case the dashboard shows a storage warning, and saving/loading persistent workspace content requires the database to be fixed.

## Connect the `formastudio` Supabase project for workspace data

Supabase is the persistence layer for brand kits, uploaded assets, and Legal Kit records. It is not the application login provider. No `app_users` table or account seeding script is required.

1. In Supabase, open the `formastudio` project and copy its Project URL.
2. Under **Settings → API Keys**, copy one server-only Secret key (`sb_secret_…`). Use the legacy service-role key only if the project does not provide a modern Secret key.
3. Set `SUPABASE_URL` and exactly one server-only key in `.env` or the host's encrypted environment settings. The publishable/anon key is not needed for app login or workspace database requests.
4. For a new database, run `schema.sql` in the Supabase SQL Editor. This creates the workspace data tables and private asset bucket, grants API access only to the server-side `service_role`, and refreshes the Data API schema cache.
5. If you are upgrading an existing database, run `migrations/20261018_add_core_messaging.sql` if tagline/elevator-pitch columns are missing, then `migrations/20261019_grant_service_role_access.sql` if the old owner foreign keys or Data API grants need repair.
6. For brand-specific access-portal records, run `migrations/20261019_compliance_by_brand_kit.sql`. It links those records to the relevant brand kit. Review existing associations if an owner has several brands.
7. Run `migrations/20261021_brand_review_reports.sql` to enable saving one brand-content alignment report, review status, and timestamped status history for each brand.
8. Start the app and verify both accounts can sign in, create and save brand kits, and retain saved content across server restarts.

### If the dashboard says workspace data is unavailable

Your login may still have succeeded. The dashboard requests persisted workspace content after login, so a table/key/schema error affects data loading, not password validation. Check the Vercel function logs for `Supabase REST rejected request`; the log records only table name, HTTP status, and safe provider error code, never credentials.

- `404` / `PGRST205`: the Data API cannot see the table. Run `schema.sql` in the **same project configured in Vercel**. If the tables already exist, run `migrations/20261019_grant_service_role_access.sql` and check the schema cache.
- `401`: check that `SUPABASE_URL` matches the project and `SUPABASE_SECRET_KEY` is a server-only secret key (or use the legacy service-role key in its dedicated variable).
- `403`: check server-role privileges and that the server-side key belongs to this project.
- `400` / `PGRST204`: the database schema is missing a field; apply the required migration.

The dashboard remains available when a workspace table query fails, and it clearly labels storage as unavailable. Saving or editing persistent kits still requires the database to be configured correctly. It does not silently claim memory-only changes were saved.

## Authentication behavior

The branded username/password form is the only login UI. Forma Studio validates the built-in account credentials locally and keeps the user role in its signed application session. The login route, session-user resolution, and application user list do not query Supabase Postgres and do not call Supabase Auth. The future Supabase Auth sign-in placeholder remains commented out.

The Supabase server key (`SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY`) is for persistent workspace data and Storage only. Never place it in browser code or commit `.env`. Optional `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_ANON_KEY` enables Supabase email OTP for restricted brand-kit and Legal Kit access requests; it is not involved in app sign-in.

If you enable email OTP, open **Authentication → Email Templates → Magic Link** and ensure the template includes `{{ .Token }}` so the six-digit code UI can work. Configure SMTP in Supabase Auth settings for production delivery.

## AI configuration

- `GEMINI_API_KEY` powers brand stories, taglines, elevator pitches, and other brand-copy requests.
- `GEMINI_MODEL` defaults to `gemini-3.6-flash`; use a model supported by your key.
- `QLOO_API_KEY` enables cultural context. `QLOO_BASE_URL` defaults to `https://hackathon.api.qloo.com`.

If Qloo is not configured or a request fails, ordinary editing and copywriting remain available.

## Vercel notes

Forma Studio uses Starlette's `SessionMiddleware`, which requires `itsdangerous`; it is explicitly listed in `requirements.txt`. If Vercel reports `ModuleNotFoundError: itsdangerous`, verify the project Root Directory points to the folder containing `requirements.txt`, commit the dependency, and redeploy.

Vercel Functions have a read-only deployed application filesystem. In production, uploaded brand assets use the private `brand-assets` Supabase Storage bucket configured by `schema.sql`; they are not written to the deployed app directory.

The included `render.yaml` is an optional Render Blueprint using the native Python runtime. It is not required for Vercel and does not mean the app is tied to Render.

## Environment setup

Set `APP_ENV=production`, a random `SESSION_SECRET` of at least 32 characters, and `SUPABASE_URL` plus one server-side key to enable persistent workspace content. `GEMINI_API_KEY` is needed for brand copy generation. No admin/client login credentials or profile-seeding step is required in the host settings. Supabase can be absent or misconfigured without preventing the built-in login from starting, though persistence will be unavailable.

## Tests

```bash
python -m pytest -q
```

The test suite checks application behavior and configuration rules, including selected-brand compliance analysis, framework selection, evidence-step persistence, and theme contrast-token ratios. It is not a penetration test, formal WCAG audit, or compliance certification.

## Accessibility review

See [ACCESSIBILITY_AUDIT.md](ACCESSIBILITY_AUDIT.md) for the source-level WCAG remediation record and required manual validation. This is not a formal conformance claim.

## Brand-kit creation paths

The Brand Kits page offers two ways to start. **Start with my brief** creates a working kit from details the user already knows. **Get guided brand direction** sends the user's early idea to Gemini and creates an editable starting point with positioning, tagline, elevator pitch, brand story, color direction, typography direction, and visual direction. The resulting kit opens in the existing editor for refinement. If Gemini is unavailable, the user's answers are preserved and the manual brief path remains available.

The authenticated workspace intentionally has no global app header or role badge. Navigation remains in the sidebar, with a mobile-only menu control on narrow screens. App login remains local to Forma Studio; Supabase is only used for workspace persistence and optional email verification.
