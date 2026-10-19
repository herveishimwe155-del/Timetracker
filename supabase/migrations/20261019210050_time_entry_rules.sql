-- Time entry rules a user can set in Settings → Time entries.
alter table public.profiles
  add column require_project boolean not null default false,
  add column require_description boolean not null default false,
  add column require_tags boolean not null default false,
  add column max_tags smallint check (max_tags between 1 and 50),
  add column lock_before date,
  add column show_times boolean not null default true,
  add column show_timesheet boolean not null default true;

-- True when an instant falls before the user's lock date, in their time zone.
create or replace function public.is_locked(p_user uuid, p_at timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (p_at at time zone coalesce(p.time_zone, 'UTC'))::date < p.lock_before
       from public.profiles p where p.id = p_user and p.lock_before is not null),
    false);
$$;
revoke all on function public.is_locked(uuid, timestamptz) from public, anon, authenticated;

-- Locked entries can't be added, changed, moved into the locked period, or deleted.
create or replace function public.enforce_entry_lock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Deleting the whole account removes everything regardless.
  if current_setting('tickr.deleting_account', true) = 'on' then
    return coalesce(new, old);
  end if;
  if tg_op in ('UPDATE', 'DELETE') and public.is_locked(old.user_id, old.start_at) then
    raise exception 'Time entries before your lock date can''t be changed'
      using errcode = 'TK423', hint = 'entry_locked';
  end if;
  if tg_op in ('INSERT', 'UPDATE') and public.is_locked(new.user_id, new.start_at) then
    raise exception 'Time entries before your lock date can''t be added'
      using errcode = 'TK423', hint = 'entry_locked';
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function public.enforce_entry_lock() from public, anon, authenticated;
create trigger enforce_entry_lock
  before insert or update or delete on public.time_entries
  for each row execute function public.enforce_entry_lock();

-- Tags: respect the maximum per entry, and don't change tags on locked entries.
create or replace function public.enforce_entry_tag_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max smallint;
  v_start timestamptz;
begin
  select max_tags into v_max from public.profiles where id = new.user_id;
  if v_max is not null and
     (select count(*) from public.time_entry_tags t where t.time_entry_id = new.time_entry_id) >= v_max then
    raise exception 'An entry can have at most % tags', v_max using errcode = 'TK422', hint = 'max_tags';
  end if;
  select start_at into v_start from public.time_entries where id = new.time_entry_id;
  if public.is_locked(new.user_id, v_start) then
    raise exception 'Time entries before your lock date can''t be changed'
      using errcode = 'TK423', hint = 'entry_locked';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_entry_tag_rules() from public, anon, authenticated;
create trigger enforce_entry_tag_rules
  before insert on public.time_entry_tags
  for each row execute function public.enforce_entry_tag_rules();

-- Account deletion bypasses the lock (see enforce_entry_lock).
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
  perform set_config('tickr.deleting_account', 'on', true);
  delete from auth.users where id = me;
end;
$$;

-- Per-tag usage for the Tags page.
create or replace function public.tag_stats()
returns table (tag_id uuid, entry_count bigint, tracked_seconds bigint, last_used_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select t.tag_id,
         count(*),
         coalesce(sum(extract(epoch from (coalesce(e.stop_at, now()) - e.start_at)))::bigint, 0),
         max(e.start_at)
    from public.time_entry_tags t
    join public.time_entries e on e.id = t.time_entry_id
   group by t.tag_id;
$$;
grant execute on function public.tag_stats() to authenticated;
