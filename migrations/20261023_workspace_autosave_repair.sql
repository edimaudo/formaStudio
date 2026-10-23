-- Repair existing Forma Studio databases when autosave cannot update brand records.
-- Run in the SQL Editor of the SAME Supabase project configured for the deployed app.
-- Idempotent: safe to run more than once. This does not change app login or Auth.

alter table public.brand_kits
  add column if not exists description text not null default '',
  add column if not exists tagline text not null default '',
  add column if not exists elevator_pitch text not null default '',
  add column if not exists industry text not null default '',
  add column if not exists audience text not null default '',
  add column if not exists cultural_country text not null default 'Canada',
  add column if not exists cultural_region text not null default 'Ontario',
  add column if not exists access_mode text not null default 'public',
  add column if not exists access_password_hash text,
  add column if not exists allowed_emails jsonb not null default '[]'::jsonb,
  add column if not exists blocks jsonb not null default '[]'::jsonb,
  add column if not exists legal_review_report jsonb not null default '{}'::jsonb,
  add column if not exists legal_review_status text not null default 'not_analyzed',
  add column if not exists legal_review_updated_at timestamptz,
  add column if not exists legal_review_history jsonb not null default '[]'::jsonb;

-- The API uses a server-side service_role key. Table-level grants also cover the newly added columns.
grant usage on schema public to service_role;
grant all privileges on table public.brand_kits to service_role;

do $$
begin
  if to_regclass('public.legal_entries') is not null then
    execute 'grant all privileges on table public.legal_entries to service_role';
  end if;
  if to_regclass('public.legal_access_requests') is not null then
    execute 'grant all privileges on table public.legal_access_requests to service_role';
  end if;
end $$;

-- Refresh the REST schema cache so newly-added columns are immediately available.
notify pgrst, 'reload schema';
