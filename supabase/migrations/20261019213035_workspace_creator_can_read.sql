-- Insert ... returning checks the select policy before the creator is added as a
-- member (that happens in an after-insert trigger), so the creator can always read it.
drop policy ws_select on public.workspaces;
create policy ws_select on public.workspaces for select to authenticated
  using (public.is_member(id) or created_by = (select auth.uid()));
