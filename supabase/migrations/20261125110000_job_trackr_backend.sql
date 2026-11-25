create table if not exists public.applications (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  job_title text not null,
  status text not null,
  modality text not null,
  work_location text,
  date_applied date not null,
  url text,
  notes text,
  is_interesting boolean not null default false,
  sync_origin text not null default 'remote' check (sync_origin in ('local', 'remote', 'merge')),
  source_updated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  merge_fingerprint text
);

create index if not exists idx_applications_user_updated
  on public.applications (user_id, updated_at desc);

alter table public.applications enable row level security;
grant select, insert, update, delete on public.applications to authenticated;

drop policy if exists applications_select_own on public.applications;
create policy applications_select_own on public.applications
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists applications_insert_own on public.applications;
create policy applications_insert_own on public.applications
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists applications_update_own on public.applications;
create policy applications_update_own on public.applications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists applications_delete_own on public.applications;
create policy applications_delete_own on public.applications
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.touch_applications_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_touch_applications_updated_at on public.applications;
create trigger trg_touch_applications_updated_at
before update on public.applications
for each row execute function public.touch_applications_updated_at();

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

alter table public.reconcile_runs enable row level security;
alter table public.reconcile_snapshots enable row level security;
grant select, insert, update, delete on public.reconcile_runs, public.reconcile_snapshots to authenticated;

drop policy if exists reconcile_runs_own on public.reconcile_runs;
create policy reconcile_runs_own on public.reconcile_runs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists reconcile_snapshots_own on public.reconcile_snapshots;
create policy reconcile_snapshots_own on public.reconcile_snapshots
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.reconcile_applications(
  p_strategy text,
  p_local_applications jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_hash text;
  v_existing public.reconcile_runs%rowtype;
  v_remote jsonb;
  v_result jsonb;
  v_created integer := 0;
  v_updated integer := 0;
  v_deleted integer := 0;
  v_affected integer := 0;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_strategy not in ('merge', 'keep_account', 'keep_local') then raise exception 'Invalid reconciliation strategy'; end if;
  if jsonb_typeof(p_local_applications) <> 'array' then raise exception 'Applications must be an array'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) > 200 then raise exception 'Invalid idempotency key'; end if;

  v_request_hash := pg_catalog.md5(p_strategy || ':' || p_local_applications::text);
  select * into v_existing from public.reconcile_runs
  where user_id = v_user_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.request_hash <> v_request_hash then raise exception 'Idempotency key reused with different payload'; end if;
    return v_existing.response_payload;
  end if;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.updated_at desc), '[]'::jsonb)
    into v_remote from public.applications a where a.user_id = v_user_id;

  if p_strategy = 'keep_account' then
    v_result := jsonb_build_object('created', 0, 'updated', 0, 'deleted', 0, 'skipped', 0, 'applications', v_remote);
  else
    if p_strategy = 'keep_local' then
      insert into public.reconcile_snapshots (user_id, strategy, snapshot_payload)
      values (v_user_id, p_strategy, jsonb_build_object('applications', v_remote));
      delete from public.applications where user_id = v_user_id;
      get diagnostics v_deleted = row_count;
    end if;

    select count(*) into v_created
    from jsonb_to_recordset(p_local_applications) as x(id text)
    where not exists (select 1 from public.applications a where a.user_id = v_user_id and a.id = x.id);

    insert into public.applications (
      id, user_id, company_name, job_title, status, modality, work_location,
      date_applied, url, notes, is_interesting, sync_origin
    )
    select x.id, v_user_id, x.company_name, x.job_title, x.status, x.modality,
      nullif(x.work_location, ''), x.date_applied, nullif(x.url, ''), nullif(x.notes, ''),
      coalesce(x.is_interesting, false), 'merge'
    from jsonb_to_recordset(p_local_applications) as x(
      id text, company_name text, job_title text, status text, modality text,
      work_location text, date_applied date, url text, notes text, is_interesting boolean
    )
    where x.id is not null and x.company_name is not null and x.job_title is not null
    on conflict (id) do update set
      company_name = excluded.company_name,
      job_title = excluded.job_title,
      status = excluded.status,
      modality = excluded.modality,
      work_location = excluded.work_location,
      date_applied = excluded.date_applied,
      url = excluded.url,
      notes = excluded.notes,
      is_interesting = excluded.is_interesting,
      sync_origin = 'merge'
    where public.applications.user_id = v_user_id;
    get diagnostics v_affected = row_count;
    v_updated := greatest(v_affected - v_created, 0);

    select coalesce(jsonb_agg(to_jsonb(a) order by a.updated_at desc), '[]'::jsonb)
      into v_remote from public.applications a where a.user_id = v_user_id;
    v_result := jsonb_build_object('created', v_created, 'updated', v_updated, 'deleted', v_deleted,
      'skipped', 0, 'applications', v_remote);
  end if;

  insert into public.reconcile_runs (user_id, idempotency_key, strategy, request_hash, response_payload)
  values (v_user_id, p_idempotency_key, p_strategy, v_request_hash, v_result);
  return v_result;
end;
$$;

revoke all on function public.reconcile_applications(text, jsonb, text) from public, anon;
grant execute on function public.reconcile_applications(text, jsonb, text) to authenticated;

-- Private staging area for moving InsForge rows. Users claim rows after creating
-- an account with the same email; no InsForge password hashes are imported.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.legacy_accounts (
  legacy_user_id uuid primary key,
  email text not null unique,
  imported_at timestamptz not null default timezone('utc', now()),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz
);

create table if not exists private.legacy_applications (
  legacy_user_id uuid not null references private.legacy_accounts(legacy_user_id) on delete cascade,
  id text not null,
  company_name text not null,
  job_title text not null,
  status text not null,
  modality text not null,
  work_location text,
  date_applied date not null,
  url text,
  notes text,
  is_interesting boolean not null default false,
  created_at timestamptz,
  updated_at timestamptz,
  primary key (legacy_user_id, id)
);

create or replace function public.claim_legacy_applications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_legacy_user_id uuid;
  v_count integer := 0;
begin
  if v_user_id is null or v_email = '' then raise exception 'Authentication required'; end if;
  select a.legacy_user_id into v_legacy_user_id
  from private.legacy_accounts a where lower(a.email) = v_email;
  if v_legacy_user_id is null then return 0; end if;

  insert into public.applications (
    id, user_id, company_name, job_title, status, modality, work_location,
    date_applied, url, notes, is_interesting, sync_origin, created_at, updated_at
  )
  select a.id, v_user_id, a.company_name, a.job_title, a.status, a.modality,
    a.work_location, a.date_applied, a.url, a.notes, a.is_interesting, 'remote',
    coalesce(a.created_at, timezone('utc', now())), coalesce(a.updated_at, timezone('utc', now()))
  from private.legacy_applications a where a.legacy_user_id = v_legacy_user_id
  on conflict (id) do update set
    user_id = excluded.user_id,
    company_name = excluded.company_name,
    job_title = excluded.job_title,
    status = excluded.status,
    modality = excluded.modality,
    work_location = excluded.work_location,
    date_applied = excluded.date_applied,
    url = excluded.url,
    notes = excluded.notes,
    is_interesting = excluded.is_interesting,
    sync_origin = 'remote',
    updated_at = excluded.updated_at
  where public.applications.user_id = v_user_id;
  get diagnostics v_count = row_count;

  update private.legacy_accounts set claimed_by = v_user_id, claimed_at = timezone('utc', now())
  where legacy_user_id = v_legacy_user_id;
  return v_count;
end;
$$;

revoke all on function public.claim_legacy_applications() from public, anon;
grant execute on function public.claim_legacy_applications() to authenticated;
