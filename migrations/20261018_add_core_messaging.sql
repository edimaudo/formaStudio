-- Apply this migration in Supabase SQL Editor if public.brand_kits already exists.
-- Safe to run more than once.
alter table public.brand_kits
  add column if not exists tagline text not null default '',
  add column if not exists elevator_pitch text not null default '';
