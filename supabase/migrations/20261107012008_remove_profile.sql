-- REQ-095, REQ-096: marks a user as removed, once nothing holds them here. Only
-- the secret key can call this. Holding the user's row means an acceptance can't
-- slip in between the check and the removal. Removing them again changes nothing.
create function public.remove_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed timestamptz;
begin
  select removed_at into removed
  from public.profiles
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'user_not_found';
  end if;

  if removed is not null then
    return;
  end if;

  if exists (
    select 1
    from public.event_participants as participant
    join public.events as event on event.id = participant.event_id
    where participant.user_id = p_user_id and participant.status = 'accepted' and event.status = 'open'
  ) then
    raise exception 'user_in_open_event';
  end if;

  update public.event_participants
  set status = 'declined'
  where user_id = p_user_id and status = 'invited';

  update public.profiles
  set removed_at = now()
  where user_id = p_user_id;
end;
$$;

revoke all on function public.remove_profile(uuid) from public, anon, authenticated;
grant execute on function public.remove_profile(uuid) to service_role;
