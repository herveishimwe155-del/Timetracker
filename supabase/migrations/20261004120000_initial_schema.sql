-- Initial MVP schema: profiles, clients, projects, time entries, tags.
-- Row-level security keeps every user to their own rows. Composite foreign keys
-- (id, user_id) also stop a row from pointing at another user's client, project or tag.

-- Profile settings for each signed-in user
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  time_zone text not null default 'UTC',
  week_start smallint not null default 1 check (week_start between 0 and 6), -- 0 = Sunday, 1 = Monday
  created_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid,
  name text not null check (length(trim(name)) > 0),
  color text not null default '#10B981' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  hourly_rate numeric(10,2) check (hourly_rate >= 0), -- used from P1
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (client_id, user_id) references clients (id, user_id) on delete set null (client_id)
);
create index projects_by_client on projects (client_id);

create table time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid,
  description text not null default '',
  start_at timestamptz not null,
  stop_at timestamptz, -- null = timer is running
  billable boolean not null default false,
  created_at timestamptz not null default now(),
  check (stop_at is null or stop_at > start_at),
  unique (id, user_id),
  foreign key (project_id, user_id) references projects (id, user_id) on delete set null (project_id)
);

-- Only one running timer per user
create unique index one_running_timer on time_entries (user_id) where stop_at is null;
create index entries_by_user_start on time_entries (user_id, start_at desc);
create index entries_by_project on time_entries (project_id);

create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  unique (user_id, name),
  unique (id, user_id)
);

create table time_entry_tags (
  time_entry_id uuid not null,
  tag_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (time_entry_id, tag_id),
  foreign key (time_entry_id, user_id) references time_entries (id, user_id) on delete cascade,
  foreign key (tag_id, user_id) references tags (id, user_id) on delete cascade
);
create index entry_tags_by_tag on time_entry_tags (tag_id);

-- Row-level security: each user sees only their own data
alter table profiles enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table time_entries enable row level security;
alter table tags enable row level security;
alter table time_entry_tags enable row level security;

-- (select auth.uid()) is evaluated once per query instead of once per row.
create policy own_profile on profiles for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy own_clients on clients for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_projects on projects for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_entries on time_entries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_tags on tags for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_entry_tags on time_entry_tags for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Signed-in users work through the policies above; signed-out visitors get nothing.
grant select, insert, update, delete on
  profiles, clients, projects, time_entries, tags, time_entry_tags
  to authenticated;
revoke all on
  profiles, clients, projects, time_entries, tags, time_entry_tags
  from anon;
