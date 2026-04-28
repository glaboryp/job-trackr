-- Applications schema for authenticated sync.
-- This migration is designed for InsForge Postgres and RLS with auth.uid().

create table if not exists public.applications (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_name text not null,
  job_title text not null,
  status text not null,
  modality text not null,
  work_location text,
  date_applied date not null,
  url text,
  notes text,
  sync_origin text not null default 'remote' check (sync_origin in ('local', 'remote', 'merge')),
  source_updated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  merge_fingerprint text
);

create table if not exists public.reconcile_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  strategy text not null check (strategy in ('merge', 'keep_account', 'keep_local')),
  request_hash text not null,
  response_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, idempotency_key)
);

create table if not exists public.reconcile_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  strategy text not null,
  snapshot_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_applications_user_updated
  on public.applications (user_id, updated_at desc);

create index if not exists idx_applications_user_fingerprint
  on public.applications (user_id, merge_fingerprint);

create index if not exists idx_reconcile_runs_user_created
  on public.reconcile_runs (user_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_touch_updated_at on public.applications;
create trigger trg_touch_updated_at
before update on public.applications
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_applications_set_user_id on public.applications;
create or replace function public.set_applications_user_id()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;

  return new;
end;
$$;

create trigger trg_applications_set_user_id
before insert on public.applications
for each row
execute function public.set_applications_user_id();

alter table public.applications enable row level security;
alter table public.reconcile_runs enable row level security;
alter table public.reconcile_snapshots enable row level security;

drop policy if exists applications_select_own on public.applications;
create policy applications_select_own
on public.applications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists applications_insert_own on public.applications;
create policy applications_insert_own
on public.applications
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists applications_update_own on public.applications;
create policy applications_update_own
on public.applications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists applications_delete_own on public.applications;
create policy applications_delete_own
on public.applications
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists reconcile_runs_own on public.reconcile_runs;
create policy reconcile_runs_own
on public.reconcile_runs
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists reconcile_snapshots_own on public.reconcile_snapshots;
create policy reconcile_snapshots_own
on public.reconcile_snapshots
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
