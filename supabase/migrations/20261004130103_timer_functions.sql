-- Phase 3: timer on the server clock, overlap guard, realtime.

-- The database clock, so browsers can correct for their own clock drift.
create function public.server_now()
returns timestamptz
language sql
stable
set search_path = ''
as $$ select now() $$;

-- Entries may not overlap (FR-6). A running entry counts as lasting until now.
-- Ranges are half-open, so one entry may end exactly when the next starts.
create function public.check_entry_overlap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Serialise writes per user so two concurrent inserts can't both pass the check.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  if exists (
    select 1
    from public.time_entries e
    where e.user_id = new.user_id
      and e.id <> new.id
      and tstzrange(e.start_at, coalesce(e.stop_at, greatest(now(), e.start_at + interval '1 second')), '[)')
       && tstzrange(new.start_at, coalesce(new.stop_at, 'infinity'::timestamptz), '[)')
  ) then
    raise exception 'This entry overlaps another time entry.'
      using errcode = '23P01', hint = 'Change the start or end time so entries do not overlap.';
  end if;

  return new;
end;
$$;

create trigger time_entries_no_overlap
  before insert or update of start_at, stop_at, user_id on public.time_entries
  for each row execute function public.check_entry_overlap();

-- Start a timer now (server time). Stops any running timer at the same instant.
create function public.start_timer(
  p_description text default '',
  p_project_id uuid default null,
  p_billable boolean default false
)
returns public.time_entries
language plpgsql
set search_path = ''
as $$
declare
  started public.time_entries;
begin
  update public.time_entries
     set stop_at = now()
   where user_id = (select auth.uid()) and stop_at is null and start_at < now();

  insert into public.time_entries (description, project_id, billable, start_at)
  values (coalesce(p_description, ''), p_project_id, coalesce(p_billable, false), now())
  returning * into started;

  return started;
end;
$$;

-- Stop the running timer now (server time). Returns null when nothing was running.
create function public.stop_timer()
returns public.time_entries
language plpgsql
set search_path = ''
as $$
declare
  stopped public.time_entries;
begin
  update public.time_entries
     set stop_at = greatest(now(), start_at + interval '1 second')
   where user_id = (select auth.uid()) and stop_at is null
  returning * into stopped;

  return stopped;
end;
$$;

revoke execute on function public.server_now(), public.start_timer(text, uuid, boolean), public.stop_timer()
  from public, anon;
grant execute on function public.server_now(), public.start_timer(text, uuid, boolean), public.stop_timer()
  to authenticated;
revoke execute on function public.check_entry_overlap() from public, anon, authenticated;

-- Push entry changes to the user's other tabs and devices (RLS still applies).
alter publication supabase_realtime add table public.time_entries;
