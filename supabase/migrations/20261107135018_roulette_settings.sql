-- REQ-117, REQ-118: spin() again, now refusing while the table is closed. A
-- repeat of a spin that already happened still gets its answer.
create or replace function public.spin(p_request_id uuid, p_choice text, p_bet numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  settings jsonb;
  current_balance bigint;
  drawn text;
  won boolean;
  movement public.ledger;
  outcome jsonb;
begin
  if not (select private.is_active()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if p_choice is null or p_choice not in ('red', 'black') then
    raise exception 'invalid_choice';
  end if;

  if p_bet is null or p_bet < 1 or p_bet <> trunc(p_bet) then
    raise exception 'invalid_bet';
  end if;

  -- The player's row comes before the claim. Claiming takes a shared lock on
  -- this row, so two spins that both claimed first would deadlock on it here.
  select balance into current_balance
  from public.profiles
  where user_id = actor and removed_at is null
  for update;

  if not found then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  outcome := private.claim_request(actor, p_request_id, 'spin');
  if outcome is not null then
    return outcome;
  end if;

  select value into settings from public.app_settings where key = 'roulette';

  if not (settings ->> 'enabled')::boolean then
    raise exception 'roulette_closed';
  end if;

  -- NaN and infinity pass the checks above, and every comparison here stops them.
  if p_bet > current_balance then
    raise exception 'insufficient_balance';
  end if;

  if p_bet > private.max_bet(current_balance, (settings ->> 'max_bet_percent')::integer) then
    raise exception 'bet_too_high';
  end if;

  drawn := private.draw_roulette((settings ->> 'white_one_in')::integer);
  won := drawn = p_choice;

  movement := private.apply_movement(
    actor,
    case when won then p_bet else -p_bet end::bigint,
    'roulette_spin',
    null,
    null,
    actor,
    jsonb_build_object('choice', p_choice, 'result', drawn)
  );

  return private.finish_request(actor, p_request_id, jsonb_build_object(
    'movement_id', movement.id,
    'choice', p_choice,
    'result', drawn,
    'won', won,
    'bet', p_bet,
    'delta', movement.delta,
    'balance_after', movement.balance_after
  ));
end;
$$;

-- REQ-108, REQ-109: what the Ruleta tab and the admin screen show. The maximum
-- bet is worked out here, so the rule lives in one place.
create function public.roulette_state()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings jsonb;
  current_balance bigint;
begin
  if not (select private.is_active()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select value into settings from public.app_settings where key = 'roulette';
  select balance into current_balance from public.profiles where user_id = (select auth.uid());

  return settings || jsonb_build_object(
    'balance', current_balance,
    'max_bet', private.max_bet(current_balance, (settings ->> 'max_bet_percent')::integer)
  );
end;
$$;

revoke all on function public.roulette_state() from public, anon, service_role;
grant execute on function public.roulette_state() to authenticated;

-- REQ-115 to REQ-117, REQ-119: only the admin, and only valid values. NaN and
-- infinity fail the upper limits.
create function public.set_roulette_settings(p_enabled boolean, p_white_one_in numeric, p_max_bet_percent numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings jsonb;
begin
  if not (select private.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if p_enabled is null then
    raise exception 'invalid_roulette_settings';
  end if;

  if p_white_one_in is null or p_white_one_in < 2 or p_white_one_in > 1000 or p_white_one_in <> trunc(p_white_one_in) then
    raise exception 'invalid_white_chance';
  end if;

  if p_max_bet_percent is null or p_max_bet_percent < 1 or p_max_bet_percent > 100
    or p_max_bet_percent <> trunc(p_max_bet_percent) then
    raise exception 'invalid_max_bet_percent';
  end if;

  update public.app_settings
  set
    value = jsonb_build_object(
      'enabled', p_enabled,
      'white_one_in', p_white_one_in::integer,
      'max_bet_percent', p_max_bet_percent::integer
    ),
    updated_at = now()
  where key = 'roulette'
  returning value into settings;

  return settings;
end;
$$;

revoke all on function public.set_roulette_settings(boolean, numeric, numeric) from public, anon, service_role;
grant execute on function public.set_roulette_settings(boolean, numeric, numeric) to authenticated;
