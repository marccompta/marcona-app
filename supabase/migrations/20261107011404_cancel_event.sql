-- REQ-084 to REQ-086, REQ-094: the creator or the admin cancels an open event.
-- Removal blocks while someone has accepted an open event, so a refund never
-- meets a removed user.
create function public.cancel_event(p_request_id uuid, p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.events;
  participant record;
  outcome jsonb;
begin
  if not (select private.is_active()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  outcome := private.claim_request(actor, p_request_id, 'cancel_event');
  if outcome is not null then
    return outcome;
  end if;

  select * into target from public.events where id = p_event_id for update;

  if not found then
    raise exception 'event_not_found';
  end if;

  if target.status <> 'open' then
    raise exception 'event_not_open';
  end if;

  if target.creator_id <> actor and not (select private.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  for participant in
    select user_id
    from public.event_participants
    where event_id = p_event_id and status = 'accepted'
    order by user_id
  loop
    perform private.apply_movement(participant.user_id, target.buy_in, 'event_refund', null, p_event_id, actor);
  end loop;

  update public.event_participants
  set status = 'lapsed'
  where event_id = p_event_id and status = 'invited';

  update public.events
  set status = 'cancelled', finished_at = now(), finished_by = actor
  where id = p_event_id;

  return private.finish_request(actor, p_request_id, jsonb_build_object('event_id', p_event_id));
end;
$$;

revoke all on function public.cancel_event(uuid, uuid) from public, anon, service_role;
grant execute on function public.cancel_event(uuid, uuid) to authenticated;
