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

  -- Claim only once. Later logins must never overwrite the user's newer data
  -- with the original InsForge backup snapshot.
  select a.legacy_user_id into v_legacy_user_id
  from private.legacy_accounts a
  where lower(a.email) = v_email and a.claimed_by is null;
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
  where legacy_user_id = v_legacy_user_id and claimed_by is null;
  return v_count;
end;
$$;
