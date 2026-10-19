-- Team workspaces. Personal data is unchanged (workspace_id is null); a workspace
-- holds shared clients, projects and tags, and members' entries tracked in it.

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  -- Team rights (Toggl's "Team member rights"): true = everyone, false = admins only.
  members_see_activity boolean not null default true,
  members_create_projects boolean not null default true,
  members_create_tags boolean not null default true
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_by_user on public.workspace_members (user_id);

-- Invite links. Only a hash of the token is stored; the link is shown once.
create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  token_hash text not null unique,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  uses integer not null default 0,
  revoked boolean not null default false
);
create index workspace_invites_by_workspace on public.workspace_invites (workspace_id);

-- Membership helpers (security definer, so policies can use them without recursion).
create or replace function public.is_member(p_workspace uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.workspace_members m
                 where m.workspace_id = p_workspace and m.user_id = (select auth.uid()));
$$;
create or replace function public.is_ws_admin(p_workspace uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.workspace_members m
                 where m.workspace_id = p_workspace and m.user_id = (select auth.uid()) and m.role = 'admin');
$$;
-- May the caller create this kind of thing in the workspace? kind: 'project' (projects and clients) or 'tag'.
create or replace function public.can_create_in(p_workspace uuid, p_kind text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_ws_admin(p_workspace) or (
    public.is_member(p_workspace) and exists (
      select 1 from public.workspaces w where w.id = p_workspace
        and case p_kind when 'tag' then w.members_create_tags else w.members_create_projects end));
$$;
-- May the caller see other members' entries in this workspace?
create or replace function public.can_see_team(p_workspace uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_ws_admin(p_workspace) or (
    public.is_member(p_workspace) and exists (
      select 1 from public.workspaces w where w.id = p_workspace and w.members_see_activity));
$$;
revoke all on function public.is_member(uuid), public.is_ws_admin(uuid), public.can_create_in(uuid, text), public.can_see_team(uuid) from public, anon;
grant execute on function public.is_member(uuid), public.is_ws_admin(uuid), public.can_create_in(uuid, text), public.can_see_team(uuid) to authenticated;

-- The creator becomes the first admin.
create or replace function public.add_workspace_creator()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role) values (new.id, new.created_by, 'admin');
  return new;
end;
$$;
revoke all on function public.add_workspace_creator() from public, anon, authenticated;
create trigger add_workspace_creator after insert on public.workspaces
  for each row execute function public.add_workspace_creator();

-- A workspace always keeps at least one admin.
create or replace function public.keep_an_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('tickr.deleting_account', true) = 'on'
     or not exists (select 1 from public.workspaces w where w.id = old.workspace_id) then
    return coalesce(new, old);
  end if;
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin') and not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = old.workspace_id and m.role = 'admin' and m.user_id <> old.user_id) then
    raise exception 'A workspace needs at least one admin. Make someone else an admin first.'
      using errcode = 'TK409', hint = 'last_admin';
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function public.keep_an_admin() from public, anon, authenticated;
create trigger keep_an_admin before update or delete on public.workspace_members
  for each row execute function public.keep_an_admin();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;

create policy ws_select on public.workspaces for select to authenticated using (public.is_member(id));
create policy ws_insert on public.workspaces for insert to authenticated with check (created_by = (select auth.uid()));
create policy ws_update on public.workspaces for update to authenticated using (public.is_ws_admin(id)) with check (public.is_ws_admin(id));
create policy ws_delete on public.workspaces for delete to authenticated using (public.is_ws_admin(id));

create policy wm_select on public.workspace_members for select to authenticated using (public.is_member(workspace_id));
create policy wm_update on public.workspace_members for update to authenticated
  using (public.is_ws_admin(workspace_id)) with check (public.is_ws_admin(workspace_id));
-- Admins remove anyone; members can leave.
create policy wm_delete on public.workspace_members for delete to authenticated
  using (public.is_ws_admin(workspace_id) or user_id = (select auth.uid()));

create policy wi_all on public.workspace_invites for all to authenticated
  using (public.is_ws_admin(workspace_id)) with check (public.is_ws_admin(workspace_id));

do $$
declare t text;
begin
  foreach t in array array['workspaces','workspace_members','workspace_invites'] loop
    execute format('create policy require_mfa on public.%I as restrictive for all to authenticated
       using ((select public.session_assurance_ok())) with check ((select public.session_assurance_ok()))', t);
  end loop;
end $$;

-- Workspace column on shared data.
alter table public.clients add column workspace_id uuid references public.workspaces (id) on delete cascade;
alter table public.projects add column workspace_id uuid references public.workspaces (id) on delete cascade;
alter table public.tags add column workspace_id uuid references public.workspaces (id) on delete cascade;
alter table public.time_entries add column workspace_id uuid references public.workspaces (id) on delete cascade;
create index clients_by_workspace on public.clients (workspace_id) where workspace_id is not null;
create index projects_by_workspace on public.projects (workspace_id) where workspace_id is not null;
create index tags_by_workspace on public.tags (workspace_id) where workspace_id is not null;
create index entries_by_workspace_start on public.time_entries (workspace_id, start_at desc) where workspace_id is not null;

-- Names are unique per person (personal) or per workspace.
drop index public.clients_unique_name;
drop index public.projects_unique_name;
drop index public.tags_unique_name;
create unique index clients_unique_name on public.clients (user_id, lower(name)) where workspace_id is null;
create unique index clients_unique_name_ws on public.clients (workspace_id, lower(name)) where workspace_id is not null;
create unique index projects_unique_name on public.projects
  (user_id, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name)) where workspace_id is null;
create unique index projects_unique_name_ws on public.projects
  (workspace_id, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name)) where workspace_id is not null;
create unique index tags_unique_name on public.tags (user_id, lower(name)) where workspace_id is null;
create unique index tags_unique_name_ws on public.tags (workspace_id, lower(name)) where workspace_id is not null;

-- References across owners are now possible inside a workspace, so the composite
-- (id, user_id) foreign keys become plain ones plus a same-space check.
alter table public.time_entries drop constraint time_entries_project_id_user_id_fkey;
alter table public.time_entries add constraint time_entries_project_id_fkey
  foreign key (project_id) references public.projects (id) on delete set null;
alter table public.projects drop constraint projects_client_id_user_id_fkey;
alter table public.projects add constraint projects_client_id_fkey
  foreign key (client_id) references public.clients (id) on delete set null;
alter table public.time_entry_tags drop constraint time_entry_tags_tag_id_user_id_fkey;
alter table public.time_entry_tags add constraint time_entry_tags_tag_id_fkey
  foreign key (tag_id) references public.tags (id) on delete cascade;
alter table public.goals drop constraint goals_project_id_user_id_fkey;
alter table public.goals add constraint goals_project_id_fkey
  foreign key (project_id) references public.projects (id) on delete cascade;

-- Does a catalog row (owner, workspace) belong to the same space as (user, workspace)?
create or replace function public.same_space(p_owner uuid, p_owner_ws uuid, p_user uuid, p_ws uuid)
returns boolean language sql immutable set search_path = '' as $$
  select case when p_ws is null then p_owner_ws is null and p_owner = p_user
              else p_owner_ws is not distinct from p_ws end;
$$;

create or replace function public.check_entry_space()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if new.workspace_id is not null and not exists (
    select 1 from public.workspace_members m where m.workspace_id = new.workspace_id and m.user_id = new.user_id) then
    raise exception 'You are not a member of that workspace' using errcode = '42501';
  end if;
  if new.project_id is not null then
    select user_id, workspace_id into r from public.projects where id = new.project_id;
    if not found or not public.same_space(r.user_id, r.workspace_id, new.user_id, new.workspace_id) then
      raise exception 'That project belongs to another workspace' using errcode = '23503';
    end if;
  end if;
  return new;
end;
$$;
create trigger check_entry_space before insert or update of project_id, workspace_id, user_id on public.time_entries
  for each row execute function public.check_entry_space();

create or replace function public.check_project_space()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if new.client_id is not null then
    select user_id, workspace_id into r from public.clients where id = new.client_id;
    if not found or not public.same_space(r.user_id, r.workspace_id, new.user_id, new.workspace_id) then
      raise exception 'That client belongs to another workspace' using errcode = '23503';
    end if;
  end if;
  return new;
end;
$$;
create trigger check_project_space before insert or update of client_id, workspace_id on public.projects
  for each row execute function public.check_project_space();

create or replace function public.check_entry_tag_space()
returns trigger language plpgsql security definer set search_path = '' as $$
declare e record; t record;
begin
  select user_id, workspace_id into e from public.time_entries where id = new.time_entry_id;
  select user_id, workspace_id into t from public.tags where id = new.tag_id;
  if not public.same_space(t.user_id, t.workspace_id, e.user_id, e.workspace_id) then
    raise exception 'That tag belongs to another workspace' using errcode = '23503';
  end if;
  return new;
end;
$$;
create trigger check_entry_tag_space before insert on public.time_entry_tags
  for each row execute function public.check_entry_tag_space();

create or replace function public.check_goal_space()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if new.project_id is not null then
    select user_id, workspace_id into r from public.projects where id = new.project_id;
    if not found or not (
      (r.workspace_id is null and r.user_id = new.user_id) or
      (r.workspace_id is not null and exists (select 1 from public.workspace_members m
         where m.workspace_id = r.workspace_id and m.user_id = new.user_id))) then
      raise exception 'That project is not yours' using errcode = '23503';
    end if;
  end if;
  return new;
end;
$$;
create trigger check_goal_space before insert or update of project_id on public.goals
  for each row execute function public.check_goal_space();
revoke all on function public.check_entry_space(), public.check_project_space(), public.check_entry_tag_space(), public.check_goal_space() from public, anon, authenticated;

-- Row-level security for shared data.
drop policy own_clients on public.clients;
drop policy own_projects on public.projects;
drop policy own_tags on public.tags;
drop policy own_entries on public.time_entries;
drop policy own_entry_tags on public.time_entry_tags;

do $$
declare t text; kind text;
begin
  foreach t in array array['clients','projects','tags'] loop
    kind := case t when 'tags' then 'tag' else 'project' end;
    execute format($p$create policy %1$s_select on public.%1$I for select to authenticated using (
      (workspace_id is null and user_id = (select auth.uid())) or (workspace_id is not null and public.is_member(workspace_id)))$p$, t);
    execute format($p$create policy %1$s_insert on public.%1$I for insert to authenticated with check (
      user_id = (select auth.uid()) and (workspace_id is null or public.can_create_in(workspace_id, %2$L)))$p$, t, kind);
    execute format($p$create policy %1$s_update on public.%1$I for update to authenticated
      using ((workspace_id is null and user_id = (select auth.uid()))
             or (workspace_id is not null and (public.is_ws_admin(workspace_id) or (user_id = (select auth.uid()) and public.is_member(workspace_id)))))
      with check ((workspace_id is null and user_id = (select auth.uid()))
             or (workspace_id is not null and (public.is_ws_admin(workspace_id) or (user_id = (select auth.uid()) and public.is_member(workspace_id)))))$p$, t);
    execute format($p$create policy %1$s_delete on public.%1$I for delete to authenticated using (
      (workspace_id is null and user_id = (select auth.uid()))
      or (workspace_id is not null and (public.is_ws_admin(workspace_id) or (user_id = (select auth.uid()) and public.is_member(workspace_id)))))$p$, t);
  end loop;
end $$;

create policy entries_select on public.time_entries for select to authenticated using (
  user_id = (select auth.uid()) or (workspace_id is not null and public.can_see_team(workspace_id)));
create policy entries_insert on public.time_entries for insert to authenticated with check (
  user_id = (select auth.uid()) and (workspace_id is null or public.is_member(workspace_id)));
create policy entries_update on public.time_entries for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (workspace_id is null or public.is_member(workspace_id)));
create policy entries_delete on public.time_entries for delete to authenticated using (user_id = (select auth.uid()));

create policy entry_tags_select on public.time_entry_tags for select to authenticated using (
  user_id = (select auth.uid()) or exists (select 1 from public.time_entries e where e.id = time_entry_id));
create policy entry_tags_insert on public.time_entry_tags for insert to authenticated with check (user_id = (select auth.uid()));
create policy entry_tags_update on public.time_entry_tags for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy entry_tags_delete on public.time_entry_tags for delete to authenticated using (user_id = (select auth.uid()));

-- The Free plan's project limit applies to personal projects only.
create or replace function public.enforce_project_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.workspace_id is not null then
    return new;
  end if;
  if (tg_op = 'INSERT' and not new.archived) or (tg_op = 'UPDATE' and old.archived and not new.archived) then
    if public.plan_of(new.user_id) = 'free'
       and (select count(*) from public.projects p
            where p.user_id = new.user_id and p.workspace_id is null and not p.archived) >= 10 then
      raise exception 'The Free plan includes up to 10 active projects'
        using errcode = 'TK402', hint = 'plan_limit';
    end if;
  end if;
  return new;
end;
$$;

-- Starting a timer in a workspace.
drop function public.start_timer(text, uuid, boolean, uuid[]);
create or replace function public.start_timer(
  p_description text default '',
  p_project_id uuid default null,
  p_billable boolean default false,
  p_tag_ids uuid[] default '{}',
  p_workspace_id uuid default null
)
returns public.time_entries language plpgsql set search_path = '' as $$
declare
  started public.time_entries;
begin
  update public.time_entries
     set stop_at = now()
   where user_id = (select auth.uid()) and stop_at is null and start_at < now();

  insert into public.time_entries (description, project_id, billable, start_at, workspace_id)
  values (coalesce(p_description, ''), p_project_id, coalesce(p_billable, false), now(), p_workspace_id)
  returning * into started;

  insert into public.time_entry_tags (time_entry_id, tag_id)
  select started.id, t from unnest(coalesce(p_tag_ids, '{}')) as t
  on conflict do nothing;

  return started;
end;
$$;
grant execute on function public.start_timer(text, uuid, boolean, uuid[], uuid) to authenticated;

-- Accepting an invite link.
create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  inv public.workspace_invites;
begin
  if me is null then
    raise exception 'Sign in first' using errcode = '28000';
  end if;
  select * into inv from public.workspace_invites
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
   for update;
  if not found or inv.revoked or inv.expires_at < now() then
    raise exception 'This invite link is invalid or has expired' using errcode = 'TK404';
  end if;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (inv.workspace_id, me, inv.role)
  on conflict (workspace_id, user_id) do nothing;
  update public.workspace_invites set uses = uses + 1 where id = inv.id;
  return inv.workspace_id;
end;
$$;
revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

-- Members with names and emails, for the Members page (members only).
create or replace function public.workspace_member_list(p_workspace uuid)
returns table (user_id uuid, role text, joined_at timestamptz, full_name text, email text)
language sql stable security definer set search_path = '' as $$
  select m.user_id, m.role, m.joined_at, p.full_name, u.email::text
    from public.workspace_members m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
   where m.workspace_id = p_workspace and public.is_member(p_workspace)
   order by m.role, coalesce(p.full_name, u.email::text);
$$;
revoke all on function public.workspace_member_list(uuid) from public, anon;
grant execute on function public.workspace_member_list(uuid) to authenticated;

-- Live updates for shared data go to the workspace's private topic too.
create or replace function public.broadcast_user_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := coalesce(new.user_id, old.user_id);
  ws uuid;
begin
  perform realtime.send(jsonb_build_object('table', tg_table_name), 'change', 'user:' || owner::text, true);
  if tg_table_name in ('clients', 'projects', 'tags', 'time_entries') then
    ws := coalesce(new.workspace_id, old.workspace_id);
    if ws is not null then
      perform realtime.send(jsonb_build_object('table', tg_table_name), 'change', 'workspace:' || ws::text, true);
    end if;
  end if;
  return null;
end;
$$;

create or replace function public.broadcast_membership_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  ws uuid := coalesce(new.workspace_id, old.workspace_id);
  member uuid := coalesce(new.user_id, old.user_id);
begin
  perform realtime.send(jsonb_build_object('table', 'workspace_members'), 'change', 'user:' || member::text, true);
  perform realtime.send(jsonb_build_object('table', 'workspace_members'), 'change', 'workspace:' || ws::text, true);
  return null;
end;
$$;
create or replace function public.broadcast_workspace_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.send(jsonb_build_object('table', 'workspaces'), 'change',
                        'workspace:' || coalesce(new.id, old.id)::text, true);
  return null;
end;
$$;
revoke all on function public.broadcast_membership_change(), public.broadcast_workspace_change() from public, anon, authenticated;
create trigger broadcast_change after insert or update or delete on public.workspace_members
  for each row execute function public.broadcast_membership_change();
create trigger broadcast_change after update or delete on public.workspaces
  for each row execute function public.broadcast_workspace_change();

-- Members may join their workspace's topic ("workspace:<id>").
create or replace function public.topic_workspace(p_topic text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  if p_topic like 'workspace:%' then
    return substring(p_topic from 11)::uuid;
  end if;
  return null;
exception when invalid_text_representation then
  return null;
end;
$$;
create policy "members receive workspace changes" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and public.is_member(public.topic_workspace(realtime.topic()))
  );
