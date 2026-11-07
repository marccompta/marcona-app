-- REQ-093: the only place payout maths lives. Each share rounds down, and the
-- remainder goes to the first place with a percentage above 0.
create function private.split_pot(p_pot bigint, p_first integer, p_second integer, p_third integer)
returns bigint[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  shares bigint[] := array[p_pot * p_first / 100, p_pot * p_second / 100, p_pot * p_third / 100];
  remainder bigint := p_pot - (p_pot * p_first / 100) - (p_pot * p_second / 100) - (p_pot * p_third / 100);
  first_paid integer := case when p_first > 0 then 1 when p_second > 0 then 2 else 3 end;
begin
  shares[first_paid] := shares[first_paid] + remainder;
  return shares;
end;
$$;

revoke all on function private.split_pot(bigint, integer, integer, integer) from public, anon, authenticated, service_role;

-- REQ-088 to REQ-094: the creator pays out an open event. With 2 participants
-- p_first is the winner, who takes the whole pot, and percentages don't apply.
create function public.complete_event(
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

revoke all on function public.complete_event(uuid, uuid, uuid, uuid, uuid) from public, anon, service_role;
grant execute on function public.complete_event(uuid, uuid, uuid, uuid, uuid) to authenticated;
