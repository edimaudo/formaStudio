-- Persist the target market used by Cultural Lens.
-- Safe to run more than once against an existing brand_kits table.
alter table public.brand_kits
  add column if not exists cultural_country text not null default 'Canada',
  add column if not exists cultural_region text not null default 'Ontario';

notify pgrst, 'reload schema';
