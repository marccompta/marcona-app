-- REQ-183, REQ-184, REQ-124: how a duel answers invitations and removals, and no
-- game can be completed by hand.
--
-- The event's lock now comes before the claim here. Claiming takes a shared lock
-- on the caller's row, and a reveal pays players while holding the event, so a
-- function that claimed first and then waited for the event would deadlock with it.

-- What every cancellation does: refund whoever is in, lapse what's pending and
-- close the event. The caller holds the event's lock.
create function private.cancel_open_event(p_event public.events, p_actor uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  participant record;
begin
  for participant in
    select user_id
    from public.event_participants
    where event_id = p_event.id and status = 'accepted'
    order by user_id
  loop
    perform private.apply_movement(participant.user_id, p_event.buy_in, 'event_refund', null, p_event.id, p_actor);
  end loop;

  update public.event_participants
  set status = 'lapsed'
  where event_id = p_event.id and status = 'invited';

  update public.events
  set status = 'cancelled', finished_at = now(), finished_by = p_actor
  where id = p_event.id;
end;
$$;

revoke all on function private.cancel_open_event(public.events, uuid) from public, anon, authenticated, service_role;

create or replace function public.answer_invitation(p_request_id uuid, p_event_id uuid, p_accept boolean)
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

  outcome := private.claim_request(actor, p_request_id, 'answer_invitation');
  if outcome is not null then
    return outcome;
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

  if target.type = 'game' then
    if not coalesce(p_accept, false) then
      -- REQ-183
      perform private.cancel_open_event(target, actor);
    elsif not exists (
      select 1 from public.event_participants where event_id = p_event_id and status = 'invited'
    ) then
      update public.events set phase = 'choosing' where id = p_event_id;
    end if;
  end if;

  return private.finish_request(
    actor,
    p_request_id,
    jsonb_build_object('event_id', p_event_id, 'accepted', coalesce(p_accept, false))
  );
end;
$$;

-- REQ-124: refused before anything is claimed or locked. An event never changes
-- type, so this needs no lock.
create or replace function public.complete_event(
  p_request_id uuid,
  p_event_id uuid,
  p_first uuid,
  p_second uuid,
  p_third uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.events;
  players uuid[];
  pot bigint;
  winners uuid[];
  percentages integer[];
  shares bigint[];
  paid_winners uuid[];
  places jsonb;
  payout record;
  outcome jsonb;
begin
  if not (select private.is_active()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if exists (select 1 from public.events where id = p_event_id and type = 'game') then
    raise exception 'game_decides_winners';
  end if;

  outcome := private.claim_request(actor, p_request_id, 'complete_event');
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

  if target.creator_id <> actor then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select array_agg(user_id) into players
  from public.event_participants
  where event_id = p_event_id and status = 'accepted';

  if cardinality(players) < 2 then
    raise exception 'not_enough_participants';
  end if;

  pot := target.buy_in * cardinality(players);

  if cardinality(players) = 2 then
    winners := array[p_first, null, null];
    percentages := array[100, 0, 0];
    shares := array[pot, 0, 0];
  else
    winners := array[p_first, p_second, p_third];
    percentages := array[target.payout_first, target.payout_second, target.payout_third];
    shares := private.split_pot(pot, target.payout_first, target.payout_second, target.payout_third);
  end if;

  select array_agg(place.user_id) into paid_winners
  from unnest(winners, percentages) as place (user_id, percentage)
  where place.percentage > 0;

  -- REQ-092: every paid place has a participant, and nobody has two.
  if exists (select 1 from unnest(paid_winners) as winner where winner is null or not winner = any (players))
    or cardinality(paid_winners) <> (select count(distinct winner) from unnest(paid_winners) as winner) then
    raise exception 'invalid_winners';
  end if;

  -- In user order, as every money function takes its locks.
  for payout in
    select place.user_id, place.amount, place.number
    from unnest(winners, shares, percentages) with ordinality as place (user_id, amount, percentage, number)
    where place.percentage > 0 and place.amount > 0
    order by place.user_id
  loop
    perform private.apply_movement(
      payout.user_id,
      payout.amount,
      'event_payout',
      null,
      p_event_id,
      actor,
      jsonb_build_object('place', payout.number)
    );
  end loop;

  select jsonb_agg(
    jsonb_build_object(
      'place', place.number,
      'user_id', place.user_id,
      'percentage', place.percentage,
      'amount', place.amount
    )
    order by place.number
  ) into places
  from unnest(winners, shares, percentages) with ordinality as place (user_id, amount, percentage, number)
  where place.percentage > 0;

  update public.event_participants
  set status = 'lapsed'
  where event_id = p_event_id and status = 'invited';

  update public.events
  set status = 'completed', finished_at = now(), finished_by = actor, results = places
  where id = p_event_id;

  return private.finish_request(actor, p_request_id, jsonb_build_object('event_id', p_event_id, 'results', places));
end;
$$;

-- REQ-184: removing someone invited to a duel cancels it. Their duels are locked
-- first, then the people involved in ID order, as every money function does. A
-- duel created in the moment between the two is caught and locked in the loop.
create or replace function public.remove_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed timestamptz;
  duels uuid[];
  duel_id uuid;
  duel public.events;
begin
  perform 1
  from public.events as event
  join public.event_participants as participant on participant.event_id = event.id
  where participant.user_id = p_user_id
    and participant.status = 'invited'
    and event.status = 'open'
    and event.type = 'game'
  order by event.id
  for update of event;

  perform 1
  from public.profiles
  where user_id = p_user_id or user_id in (
    select other.user_id
    from public.event_participants as mine
    join public.events as event on event.id = mine.event_id
    join public.event_participants as other on other.event_id = event.id
    where mine.user_id = p_user_id
      and mine.status = 'invited'
      and event.status = 'open'
      and event.type = 'game'
      and other.status = 'accepted'
  )
  order by user_id
  for update;

  select removed_at into removed
  from public.profiles
  where user_id = p_user_id;

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

  select array_agg(event.id order by event.id) into duels
  from public.events as event
  join public.event_participants as participant on participant.event_id = event.id
  where participant.user_id = p_user_id
    and participant.status = 'invited'
    and event.status = 'open'
    and event.type = 'game';

  update public.event_participants
  set status = 'declined'
  where user_id = p_user_id and status = 'invited';

  foreach duel_id in array coalesce(duels, '{}') loop
    select * into duel from public.events where id = duel_id for update;
    if duel.status = 'open' then
      perform private.cancel_open_event(duel, duel.creator_id);
    end if;
  end loop;

  update public.profiles
  set removed_at = now()
  where user_id = p_user_id;
end;
$$;
