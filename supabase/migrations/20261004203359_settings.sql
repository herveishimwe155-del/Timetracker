-- Settings: 12- or 24-hour clock, and self-service account deletion.

alter table public.profiles
  add column time_format text not null default '24h' check (time_format in ('12h', '24h'));

-- Deletes the caller's own account. Every table references auth.users with
-- "on delete cascade", so their entries, projects, clients, tags, goals and
-- profile go with it. Security definer is needed to touch auth.users; the
-- function can only ever delete auth.uid(), and refuses when signed out.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
