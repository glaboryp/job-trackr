alter table public.applications
  alter column user_id set default auth.uid();

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

drop trigger if exists trg_applications_set_user_id on public.applications;
create trigger trg_applications_set_user_id
before insert on public.applications
for each row
execute function public.set_applications_user_id();
