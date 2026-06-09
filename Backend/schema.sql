-- VaultShare database schema (run in Supabase SQL editor)
-- NOTE: secrets themselves are NEVER stored here — only metadata.
--       Ciphertext lives in Redis with a TTL. The DB only tracks
--       what a logged-in user created, for the dashboard.

-- ---------------------------------------------------------------
-- Secret metadata (no ciphertext, no keys — privacy by design)
-- ---------------------------------------------------------------
create table if not exists public.secrets_metadata (
  id                 uuid primary key default gen_random_uuid(),
  secret_id          text not null unique,        -- the opaque Redis id
  owner_id           uuid not null references auth.users(id) on delete cascade,
  label              text not null default 'Untitled secret',
  expiry             text not null,               -- '1h' | '1d' | '7d'
  max_views          int  not null default 1,
  password_protected boolean not null default false,
  status             text not null default 'active', -- active | viewed | expired
  created_at         timestamptz not null default now()
);

create index if not exists secrets_metadata_owner_idx
  on public.secrets_metadata (owner_id, created_at desc);

-- ---------------------------------------------------------------
-- Contact submissions (Mandate 2)
-- ---------------------------------------------------------------
create table if not exists public.contact_submissions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Row Level Security
-- The backend uses the service-role key (bypasses RLS), but we still
-- enable RLS so nothing is exposed if anon keys are ever used client-side.
-- ---------------------------------------------------------------
alter table public.secrets_metadata   enable row level security;
alter table public.contact_submissions enable row level security;

-- Users may read only their own secret metadata.
create policy "owners read own metadata"
  on public.secrets_metadata for select
  using (auth.uid() = owner_id);

-- No client-side writes to contact (backend service role only).
create policy "no client contact access"
  on public.contact_submissions for select
  using (false);
