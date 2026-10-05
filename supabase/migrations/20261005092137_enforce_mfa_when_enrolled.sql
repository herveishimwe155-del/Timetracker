-- True when the session meets the user's own bar: aal2 if they have a verified
-- second factor, aal1 otherwise.
create or replace function public.session_assurance_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = (select auth.uid()) and f.status = 'verified'
      );
$$;

revoke all on function public.session_assurance_ok() from public, anon;
grant execute on function public.session_assurance_ok() to authenticated;

-- Restrictive: combined with AND on top of the existing "own rows" policies.
do $$
declare t text;
begin
  foreach t in array array['profiles','clients','projects','tags','time_entries','time_entry_tags','goals'] loop
    execute format('drop policy if exists require_mfa on public.%I', t);
    execute format(
      'create policy require_mfa on public.%I as restrictive for all to authenticated
       using ((select public.session_assurance_ok())) with check ((select public.session_assurance_ok()))', t);
  end loop;
end $$;

-- Deleting the account also needs the second factor when one is set up.
create or replace function public.delete_my_account()
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
  if not public.session_assurance_ok() then
    raise exception 'Two-step verification required' using errcode = '42501';
  end if;
  delete from auth.users where id = me;
end;
$$;
