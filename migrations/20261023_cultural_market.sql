-- Persist the target market used by Cultural Lens.
-- Safe to run more than once against an existing brand_kits table.
alter table public.brand_kits
  add column if not exists cultural_country text not null default 'Canada',
  add column if not exists cultural_region text not null default 'Ontario';

-- Ensure the server-side app role can update the new fields in existing projects.
grant usage on schema public to service_role;
grant all privileges on table public.brand_kits to service_role;

notify pgrst, 'reload schema';
