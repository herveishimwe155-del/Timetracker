-- Projects table: total tracked time and last activity per project, in one query.
-- Runs as the caller, so row-level security limits it to their own entries.
create function public.project_stats()
returns table (project_id uuid, tracked_seconds bigint, last_tracked_at timestamptz, entry_count bigint)
language sql
stable
set search_path = ''
as $$
  select
    e.project_id,
    coalesce(sum(extract(epoch from (coalesce(e.stop_at, now()) - e.start_at)))::bigint, 0),
    max(e.start_at),
    count(*)
  from public.time_entries e
  where e.project_id is not null
  group by e.project_id
$$;

revoke execute on function public.project_stats() from public, anon;
grant execute on function public.project_stats() to authenticated;
