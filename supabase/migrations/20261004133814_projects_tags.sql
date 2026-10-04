-- Phase 4: clients, projects and tags in use.

-- Names are unique per user regardless of case ("Design" = "design").
-- Projects may share a name under different clients.
-- Note: deleting a client sets its projects to "no client", which fails when a
-- no-client project of the same name exists. The app archives clients instead;
-- any future "delete client" must rename or merge such projects first.
create unique index clients_unique_name on public.clients (user_id, lower(name));
create unique index projects_unique_name
  on public.projects (user_id, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
alter table public.tags drop constraint tags_user_id_name_key;
create unique index tags_unique_name on public.tags (user_id, lower(name));

-- Replace an entry's tags in one call. RLS and the composite foreign keys make sure
-- both the entry and every tag belong to the caller.
create function public.set_entry_tags(p_entry_id uuid, p_tag_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.time_entry_tags
   where time_entry_id = p_entry_id
     and not (tag_id = any (coalesce(p_tag_ids, '{}')));

  insert into public.time_entry_tags (time_entry_id, tag_id)
  select p_entry_id, t from unnest(coalesce(p_tag_ids, '{}')) as t
  on conflict do nothing;
end;
$$;

-- start_timer now also takes tags.
drop function public.start_timer(text, uuid, boolean);

create function public.start_timer(
  p_description text default '',
  p_project_id uuid default null,
  p_billable boolean default false,
  p_tag_ids uuid[] default '{}'
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

  insert into public.time_entry_tags (time_entry_id, tag_id)
  select started.id, t from unnest(coalesce(p_tag_ids, '{}')) as t
  on conflict do nothing;

  return started;
end;
$$;

revoke execute on function public.set_entry_tags(uuid, uuid[]), public.start_timer(text, uuid, boolean, uuid[])
  from public, anon;
grant execute on function public.set_entry_tags(uuid, uuid[]), public.start_timer(text, uuid, boolean, uuid[])
  to authenticated;

-- Keep other tabs and devices in sync for these tables too.
alter publication supabase_realtime add table public.clients, public.projects, public.tags, public.time_entry_tags;
