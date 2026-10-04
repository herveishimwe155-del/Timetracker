-- Goals (like Toggl's): "at least / at most N hours per day / week", optionally for one project.
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid,
  comparison text not null default 'at_least' check (comparison in ('at_least', 'at_most')),
  target_seconds integer not null check (target_seconds between 60 and 168 * 3600),
  period text not null default 'week' check (period in ('day', 'week')),
  created_at timestamptz not null default now(),
  -- A goal can only point at the owner's project; deleting the project removes the goal.
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade
);
create index goals_by_user on public.goals (user_id);
create index goals_by_project on public.goals (project_id, user_id);

alter table public.goals enable row level security;
create policy own_goals on public.goals for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.goals to authenticated;
revoke all on public.goals from anon;

alter publication supabase_realtime add table public.goals;
