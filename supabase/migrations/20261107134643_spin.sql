-- REQ-111: a spin is a movement with no event.
alter table public.ledger drop constraint ledger_kind_check;
alter table public.ledger add constraint ledger_kind_check
  check (kind in ('admin_adjustment', 'event_buy_in', 'event_refund', 'event_payout', 'roulette_spin'));

-- REQ-108: the percentage of the balance, rounded down and never below 1.
create function private.max_bet(p_balance bigint, p_percent integer)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select greatest(1, p_balance * p_percent / 100);
$$;

revoke all on function private.max_bet(bigint, integer) from public, anon, authenticated, service_role;

-- REQ-102 to REQ-111: one spin, in one transaction. The browser only ever sees
-- the result this returns.
create function public.spin(p_request_id uuid, p_choice text, p_bet numeric)
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

revoke all on function public.spin(uuid, text, numeric) from public, anon, service_role;
grant execute on function public.spin(uuid, text, numeric) to authenticated;
