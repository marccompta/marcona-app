-- REQ-079 to REQ-082: an invited user accepts or declines. Locks go in the fixed
-- order, the event, then users, then participant rows. Removal also takes the
-- user before the participant row, so the charge comes before the update here.
create function public.answer_invitation(p_request_id uuid, p_event_id uuid, p_accept boolean)
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

  outcome := private.claim_request(actor, p_request_id, 'answer_invitation');
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

  if not exists (
    select 1
    from public.event_participants
    where event_id = p_event_id and user_id = actor and status = 'invited'
  ) then
    raise exception 'invitation_not_pending';
  end if;

  if p_accept then
    perform private.apply_movement(actor, -target.buy_in, 'event_buy_in', null, p_event_id, actor);
  end if;

  update public.event_participants
  set status = case when p_accept then 'accepted' else 'declined' end
  where event_id = p_event_id and user_id = actor and status = 'invited';

  if not found then
    raise exception 'invitation_not_pending';
  end if;

  return private.finish_request(
    actor,
    p_request_id,
    jsonb_build_object('event_id', p_event_id, 'accepted', coalesce(p_accept, false))
  );
end;
$$;

revoke all on function public.answer_invitation(uuid, uuid, boolean) from public, anon, service_role;
grant execute on function public.answer_invitation(uuid, uuid, boolean) to authenticated;
