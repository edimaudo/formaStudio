-- Link Forma Studio account profiles to Supabase Auth and remove app-managed password storage.
-- Run after schema.sql on an existing deployment.
alter table public.app_users
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade;
alter table public.app_users alter column password_hash drop not null;

-- One-time codes are issued and verified by Supabase Auth now.
drop table if exists public.kit_access_codes;
