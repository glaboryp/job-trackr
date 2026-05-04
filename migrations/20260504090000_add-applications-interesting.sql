-- Add is_interesting flag to applications.

alter table public.applications
  add column if not exists is_interesting boolean not null default false;
