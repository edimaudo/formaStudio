-- Repair access for an existing Forma Studio workspace schema.
-- App login and role identities are local; workspace rows do not require app_users rows.
-- Run this in the SQL Editor of the SAME Supabase project configured in Vercel.

alter table if exists public.brand_kits drop constraint if exists brand_kits_owner_id_fkey;
alter table if exists public.legal_entries drop constraint if exists legal_entries_owner_id_fkey;
alter table if exists public.legal_access_requests drop constraint if exists legal_access_requests_owner_id_fkey;

grant usage on schema public to service_role;
grant all privileges on table
  public.brand_kits,
  public.legal_entries,
  public.legal_access_requests
  to service_role;

notify pgrst, 'reload schema';
