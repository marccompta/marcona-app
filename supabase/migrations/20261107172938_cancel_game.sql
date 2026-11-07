-- REQ-135: the creator or the admin cancels an unrevealed game, and everyone in it
-- is refunded, locked in or not. The event's lock now comes before the claim, as
-- in answer_invitation(), because the admin may be playing in the game they cancel.
-- The choices stay in the private schema, and nothing ever reveals them.
create or replace function public.cancel_event(p_request_id uuid, p_event_id uuid)
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

  select * into target from public.events where id = p_event_id for update;

  if not found then
    raise exception 'event_not_found';
  end if;

  outcome := private.claim_request(actor, p_request_id, 'cancel_event');
  if outcome is not null then
    return outcome;
  end if;

  if target.status <> 'open' then
    raise exception 'event_not_open';
  end if;

  if target.creator_id <> actor and not (select private.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  perform private.cancel_open_event(target, actor);

  return private.finish_request(actor, p_request_id, jsonb_build_object('event_id', p_event_id));
end;
$$;
