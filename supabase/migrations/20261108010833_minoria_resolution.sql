-- REQ-161, REQ-162, REQ-163: what each player of La minoria gets. The smaller side
-- splits the whole pot, each share rounded down, and the remainder goes to whoever
-- on that side locked in first, by the stored sequence, so there are no ties. A
-- tie or a unanimous choice gives everyone their buy-in back.
create function private.minoria_reveal(p_event public.events)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  count_a integer;
  count_b integer;
  winners integer;
  pot bigint;
  verdict text;
  smaller text;
  share bigint;
  first_in uuid;
begin
  select count(*) filter (where choice = 'a'), count(*) filter (where choice = 'b')
  into count_a, count_b
  from private.choices
  where event_id = p_event.id;

  pot := p_event.buy_in * (count_a + count_b);

  if count_a = count_b then
    verdict := 'tie';
  elsif count_a = 0 or count_b = 0 then
    verdict := 'unanimous';
  else
    verdict := 'split';
    smaller := case when count_a < count_b then 'a' else 'b' end;
    winners := least(count_a, count_b);
    share := pot / winners;

    select user_id into first_in
    from private.choices
    where event_id = p_event.id and choice = smaller
    order by lock_order
    limit 1;
  end if;

  return jsonb_build_object(
    'verdict', verdict,
    'minority', smaller,
    'share', share,
    'remainder_to', first_in,
    'players', (
      select jsonb_agg(
        jsonb_build_object(
          'user_id', mine.user_id,
          'choice', mine.choice,
          'payout', case
            when verdict <> 'split' then p_event.buy_in
            when mine.choice <> smaller then 0
            when mine.user_id = first_in then pot - share * (winners - 1)
            else share
          end
        )
        order by mine.user_id
      )
      from private.choices as mine
      where mine.event_id = p_event.id
    )
  );
end;
$$;

revoke all on function private.minoria_reveal(public.events) from public, anon, authenticated, service_role;

-- REQ-127, REQ-145, REQ-163: as in slice 005, with a branch for La minoria. Its
-- refunds are refund movements, so the audit says what they are.
create or replace function private.resolve_game(p_event public.events)
returns void
language plpgsql
set search_path = ''
as $$
declare
  outcome jsonb;
  kind text := 'event_payout';
  player record;
begin
  if p_event.game = 'confia_o_traeix' then
    outcome := private.duel_reveal(p_event);
  elsif p_event.game = 'la_minoria' then
    outcome := private.minoria_reveal(p_event);
    if outcome ->> 'verdict' <> 'split' then
      kind := 'event_refund';
    end if;
  else
    raise exception 'game_not_found';
  end if;

  for player in
    select *
    from jsonb_to_recordset(outcome -> 'players') as paid (user_id uuid, choice text, payout bigint)
    where paid.payout > 0
    order by paid.user_id
  loop
    perform private.apply_movement(
      player.user_id,
      player.payout,
      kind,
      null,
      p_event.id,
      p_event.creator_id,
      jsonb_build_object('choice', player.choice)
    );
  end loop;

  update public.events
  set status = 'completed', phase = 'revealed', reveal = outcome, finished_at = now(), finished_by = p_event.creator_id
  where id = p_event.id;
end;
$$;

-- REQ-193, REQ-205: La minoria's options are a and b, and its first choice is
-- final. A duel's taps still replace each other (REQ-202). Otherwise as in slice
-- 005: no public table changes until the reveal (REQ-194).
create or replace function public.lock_in(p_request_id uuid, p_event_id uuid, p_choice text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.events;
  outcome jsonb;
  everyone_chose boolean;
begin
  if not (select private.is_active()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select * into target from public.events where id = p_event_id and type = 'game' for update;

  if not found then
    raise exception 'event_not_found';
  end if;

  outcome := private.claim_request(actor, p_request_id, 'lock_in');
  if outcome is not null then
    return outcome;
  end if;

  if not exists (
    select 1
    from public.event_participants
    where event_id = p_event_id and user_id = actor and status = 'accepted'
  ) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if target.status = 'cancelled' then
    raise exception 'event_not_open';
  end if;

  -- REQ-204: too late to change anything, so the app shows the reveal.
  if target.phase = 'revealed' then
    return private.finish_request(
      actor,
      p_request_id,
      jsonb_build_object('event_id', p_event_id, 'saved', false, 'revealed', true)
    );
  end if;

  if target.phase <> 'choosing' then
    raise exception 'game_not_choosing';
  end if;

  if p_choice is null or not (
    (target.game = 'confia_o_traeix' and p_choice in ('confia', 'traeix'))
    or (target.game = 'la_minoria' and p_choice in ('a', 'b'))
  ) then
    raise exception 'invalid_game_choice';
  end if;

  if target.game = 'la_minoria' then
    -- REQ-205
    insert into private.choices (event_id, user_id, choice)
    values (p_event_id, actor, p_choice)
    on conflict (event_id, user_id) do nothing;

    if not found then
      raise exception 'choice_locked';
    end if;
  else
    insert into private.choices (event_id, user_id, choice)
    values (p_event_id, actor, p_choice)
    on conflict (event_id, user_id) do update set choice = excluded.choice;
  end if;

  select count(*) = (
    select count(*) from public.event_participants where event_id = p_event_id and status = 'accepted'
  ) into everyone_chose
  from private.choices
  where event_id = p_event_id;

  -- REQ-127: in this same transaction.
  if everyone_chose then
    perform private.resolve_game(target);
  end if;

  return private.finish_request(
    actor,
    p_request_id,
    jsonb_build_object('event_id', p_event_id, 'saved', true, 'revealed', everyone_chose)
  );
end;
$$;
