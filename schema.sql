-- Forma Studio schema for Supabase Postgres.
-- Run in Supabase SQL Editor before setting SUPABASE_URL and SUPABASE_SECRET_KEY.
-- SUPABASE_SERVICE_ROLE_KEY (legacy JWT) is also supported for existing deployments.
-- FastAPI uses the server Secret key for data access and Supabase Auth for credential verification. Keep all keys out of browser code.

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  username text unique not null,
  email text unique not null,
  display_name text not null,
  role text not null check (role in ('admin', 'client')),
  password_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_users(id) on delete cascade,
  name text not null,
  brand_name text not null,
  slug text unique not null,
  description text not null default '',
  tagline text not null default '',
  elevator_pitch text not null default '',
  industry text not null default '',
  audience text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  access_mode text not null default 'public' check (access_mode in ('public', 'password', 'email')),
  access_password_hash text,
  allowed_emails jsonb not null default '[]'::jsonb,
  blocks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists brand_kits_owner_updated_idx on public.brand_kits (owner_id, updated_at desc);
create index if not exists brand_kits_status_idx on public.brand_kits (status);

create table if not exists public.legal_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_users(id) on delete cascade,
  standard text not null check (standard in ('GDPR', 'SOC 2 Type II', 'ISO 27001')),
  status text not null default 'not_configured' check (status in ('not_configured', 'in_progress', 'documented', 'verified')),
  document_url text not null default '',
  access_mode text not null default 'request' check (access_mode in ('public', 'request')),
  notes text not null default '',
  updated_at timestamptz not null default now(),
  unique (owner_id, standard)
);

create table if not exists public.legal_access_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_users(id) on delete cascade,
  entry_id uuid not null references public.legal_entries(id) on delete cascade,
  standard text not null,
  email text not null,
  requester_name text not null default '',
  reason text not null default '',
  verification_token text unique,
  status text not null default 'pending' check (status in ('verification_pending', 'pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  unique (entry_id, email)
);
create index if not exists legal_access_requests_owner_status_idx on public.legal_access_requests (owner_id, status, created_at desc);

-- Lock down direct API access. The FastAPI server uses the private service-role key.
alter table public.app_users enable row level security;
alter table public.brand_kits enable row level security;
alter table public.legal_entries enable row level security;
alter table public.legal_access_requests enable row level security;

-- Do not create anon/authenticated policies for these private application tables.
-- Configure backups, service-role rotation, storage policies, and a production email provider before launch.

-- Private bucket for uploaded brand assets. The app proxies downloads through FastAPI
-- after checking the brand kit's access mode; do not expose objects through public policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-assets', 'brand-assets', false, 15728640,
  array['image/png','image/jpeg','image/webp','image/gif','application/pdf','video/mp4','video/webm','model/gltf-binary','model/gltf+json','font/woff','font/woff2','font/ttf','font/otf','image/svg+xml','application/zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation']
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
