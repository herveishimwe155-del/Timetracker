-- Live updates go to a private topic per user ("user:<uid>") and carry only the table name.
-- Replaces postgres_changes, whose DELETE events reached every subscriber (old row ids, unfiltered by RLS).
create or replace function public.broadcast_user_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid := coalesce(new.user_id, old.user_id);
begin
  perform realtime.send(
    jsonb_build_object('table', tg_table_name),
    'change',
    'user:' || owner::text,
    true
  );
  return null;
end;
$$;

revoke all on function public.broadcast_user_change() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['time_entries','time_entry_tags','projects','clients','tags','goals'] loop
    execute format('drop trigger if exists broadcast_change on public.%I', t);
    execute format(
      'create trigger broadcast_change after insert or update or delete on public.%I
       for each row execute function public.broadcast_user_change()', t);
    if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime drop table public.%I', t);
    end if;
  end loop;
end $$;

-- Only the owner can join (and so receive) their topic. Nobody can send from the client.
drop policy if exists "users receive their own changes" on realtime.messages;
create policy "users receive their own changes" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() = 'user:' || (select auth.uid())::text
  );
