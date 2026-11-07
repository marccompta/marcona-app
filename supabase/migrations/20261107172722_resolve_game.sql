-- REQ-140 to REQ-143: what each player of a duel gets, from the settings stored
-- with the event. Payouts round down, and the house covers or keeps the rest.
create function private.duel_reveal(p_event public.events)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('players', jsonb_agg(
    jsonb_build_object(
      'user_id', mine.user_id,
      'choice', mine.choice,
      'percentage', rule.percentage,
      'payout', p_event.buy_in * rule.percentage / 100
    )
    order by mine.user_id
  ))
  from private.choices as mine
  join private.choices as theirs on theirs.event_id = mine.event_id and theirs.user_id <> mine.user_id
  cross join lateral (
    select (p_event.settings ->> case
      when mine.choice = 'confia' and theirs.choice = 'confia' then 'both_trust'
      when mine.choice = 'traeix' and theirs.choice = 'confia' then 'betrayer'
      when mine.choice = 'confia' and theirs.choice = 'traeix' then 'betrayed'
      else 'both_betray'
    end)::bigint as percentage
  ) as rule
  where mine.event_id = p_event.id;
$$;

revoke all on function private.duel_reveal(public.events) from public, anon, authenticated, service_role;

-- REQ-127, REQ-145: reveals and pays in the caller's transaction, which holds the
-- event's lock. It branches by game, so slice 007 only adds a branch. The creator
-- is the actor, so nothing shows who tapped last. A payout of 0 writes no movement.
create or replace function private.resolve_game(p_event public.events)
returns void
language plpgsql
set search_path = ''
as $$
declare
  outcome jsonb;
  player record;
begin
  if p_event.game = 'confia_o_traeix' then
    outcome := private.duel_reveal(p_event);
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
      'event_payout',
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
