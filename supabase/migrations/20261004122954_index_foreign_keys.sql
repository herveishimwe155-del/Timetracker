-- Covering indexes for every foreign key (Supabase performance advisor 0001).
-- The composite (x_id, user_id) indexes replace the single-column ones.

drop index if exists projects_by_client;
drop index if exists entries_by_project;
drop index if exists entry_tags_by_tag;

create index clients_by_user on clients (user_id);
create index projects_by_user on projects (user_id);
create index projects_by_client on projects (client_id, user_id);
create index entries_by_project on time_entries (project_id, user_id);
create index entry_tags_by_user on time_entry_tags (user_id);
create index entry_tags_by_entry on time_entry_tags (time_entry_id, user_id);
create index entry_tags_by_tag on time_entry_tags (tag_id, user_id);
