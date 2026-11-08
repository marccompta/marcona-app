-- REQ-156, REQ-157, REQ-158, REQ-185: the creator starts La minoria once at least 3
-- have paid, counting the admin only if they play, because only accepted players
-- have a row in that state. Pending invitations lapse unpaid. No money moves, but
-- it takes a request ID like every other action, so a retry after a lost reply
-- gets the first answer. The event's lock comes before the claim, as in
-- answer_invitation().
create function public.start_game(p_request_id uuid, p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.events;
  outcome jsonb;
begin
  if not (select private.is_active()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select * into target from public.events where id = p_event_id and type = 'game' for update;

  if not found then
    raise exception 'event_not_found';
  end if;

  outcome := private.claim_request(actor, p_request_id, 'start_game');
  if outcome is not null then
    return outcome;
  end if;

  -- REQ-157
  if target.creator_id <> actor then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if target.status <> 'open' then
    raise exception 'event_not_open';
  end if;

  if target.game <> 'la_minoria' then
    raise exception 'game_has_no_start';
  end if;

  if target.phase <> 'inviting' then
    raise exception 'game_not_inviting';
  end if;

  -- REQ-157, REQ-185
  if (select count(*) from public.event_participants where event_id = p_event_id and status = 'accepted') < 3 then
    raise exception 'not_enough_players';
  end if;

  -- REQ-158
  update public.event_participants
  set status = 'lapsed'
  where event_id = p_event_id and status = 'invited';

  update public.events set phase = 'choosing' where id = p_event_id;

  return private.finish_request(actor, p_request_id, jsonb_build_object('event_id', p_event_id));
end;
$$;

revoke all on function public.start_game(uuid, uuid) from public, anon, service_role;
grant execute on function public.start_game(uuid, uuid) to authenticated;
