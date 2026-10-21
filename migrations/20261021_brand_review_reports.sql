-- Persist one content-alignment report and review timeline per brand kit.
-- Run in the Supabase SQL Editor for an existing Forma Studio project.

alter table public.brand_kits
  add column if not exists legal_review_report jsonb not null default '{}'::jsonb,
  add column if not exists legal_review_status text not null default 'not_analyzed',
  add column if not exists legal_review_updated_at timestamptz,
  add column if not exists legal_review_history jsonb not null default '[]'::jsonb;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'brand_kits_legal_review_status_check'
      and conrelid = 'public.brand_kits'::regclass
  ) then
    alter table public.brand_kits
      add constraint brand_kits_legal_review_status_check
      check (legal_review_status in ('not_analyzed', 'analysis_ready', 'in_review', 'changes_needed', 'reviewed'));
  end if;
end $$;

grant all privileges on table public.brand_kits to service_role;
notify pgrst, 'reload schema';
