-- What an invite link is for, so the join page can name the workspace before accepting.
create or replace function public.invite_preview(p_token text)
returns table (workspace_name text, role text, valid boolean)
language sql stable security definer set search_path = '' as $$
  select w.name, i.role, (not i.revoked and i.expires_at > now())
    from public.workspace_invites i
    join public.workspaces w on w.id = i.workspace_id
   where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;
revoke all on function public.invite_preview(text) from public, anon;
grant execute on function public.invite_preview(text) to authenticated;
