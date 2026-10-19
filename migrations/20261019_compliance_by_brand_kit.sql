-- Link compliance work to the brand kit it supports. Run in the Supabase SQL Editor.
alter table public.legal_entries add column if not exists brand_kit_id uuid;
alter table public.legal_entries drop constraint if exists legal_entries_owner_id_standard_key;

update public.legal_entries le
set brand_kit_id = (
  select bk.id
  from public.brand_kits bk
  where bk.owner_id = le.owner_id
  order by bk.updated_at desc nulls last, bk.created_at desc nulls last
  limit 1
)
where le.brand_kit_id is null;

alter table public.legal_entries drop constraint if exists legal_entries_brand_kit_id_fkey;
alter table public.legal_entries add constraint legal_entries_brand_kit_id_fkey
  foreign key (brand_kit_id) references public.brand_kits(id) on delete cascade;

create unique index if not exists legal_entries_brand_kit_standard_unique
  on public.legal_entries (brand_kit_id, standard);
grant all privileges on table public.legal_entries to service_role;
notify pgrst, 'reload schema';
