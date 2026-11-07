-- Ends a user's sessions. Supabase's admin sign-out takes the user's own token,
-- which the admin-users Edge Function doesn't have, so it deletes their rows.
-- Their refresh tokens go with them. Only the secret key can call this.
create function public.revoke_sessions(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where user_id = p_user_id;
$$;

revoke all on function public.revoke_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_sessions(uuid) to service_role;
