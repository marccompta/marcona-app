-- Event rules that the hosted tests can't reach. Run this through the Supabase
-- MCP server's execute_sql, as the database owner.
--
-- It always ends by raising an exception, which rolls everything back and
-- carries the results in its message. Every entry should say "passed".
do $$
declare
  results jsonb := '{}';
  shares bigint[];
  checked integer := 0;
  first_paid integer;
  pot bigint;
  first integer;
  second integer;
  failures text := '';
  admin_id uuid := (select user_id from public.profiles where role = 'admin');
  anna uuid := gen_random_uuid();
  bea uuid := gen_random_uuid();
  request uuid := gen_random_uuid();
  forced_id uuid;
  repeat_id uuid;
  charged bigint;
begin
  -- REQ-093: the examples from the spec.
  if private.split_pot(21, 50, 30, 20) = array[11, 6, 4]::bigint[]
    and private.split_pot(21, 0, 60, 40) = array[0, 13, 8]::bigint[]
    and private.split_pot(21, 100, 0, 0) = array[21, 0, 0]::bigint[]
    and private.split_pot(21, 0, 0, 100) = array[0, 0, 21]::bigint[] then
    results := results || '{"REQ-093 spec examples": "passed"}';
  else
    results := results || '{"REQ-093 spec examples": "FAILED"}';
  end if;

  -- REQ-093: awkward pots against every percentage split. Shares must sum to
  -- the pot, stay at 0 or above, leave 0% places empty, and differ from a plain
  -- round-down only at the first paid place.
  foreach pot in array array[1, 2, 3, 7, 21, 99, 100, 101, 997, 1000, 123457, 3000000000]::bigint[] loop
    for first in 0..100 loop
      for second in 0..(100 - first) loop
        shares := private.split_pot(pot, first, second, 100 - first - second);
        first_paid := case when first > 0 then 1 when second > 0 then 2 else 3 end;
        checked := checked + 1;

        if shares[1] + shares[2] + shares[3] <> pot
          or shares[1] < 0 or shares[2] < 0 or shares[3] < 0
          or (first = 0 and shares[1] <> 0)
          or (second = 0 and shares[2] <> 0)
          or (first + second = 100 and shares[3] <> 0)
          or (first_paid <> 1 and shares[1] <> pot * first / 100)
          or (first_paid <> 2 and shares[2] <> pot * second / 100)
          or (first_paid <> 3 and shares[3] <> pot * (100 - first - second) / 100) then
          failures := failures || format('%s at %s/%s; ', pot, first, second);
        end if;
      end loop;
    end loop;
  end loop;

  results := results || jsonb_build_object(
    'REQ-093 splits checked', checked,
    'REQ-093 always sums to the pot', case when failures = '' then 'passed' else 'FAILED: ' || left(failures, 300) end
  );

  -- Forced participation needs the real admin, and only rolled-back accounts.
  insert into auth.users (id, email) values
    (anna, 'forced-anna@marcona.invalid'),
    (bea, 'forced-bea@marcona.invalid');
  insert into public.profiles (user_id, username) values
    (anna, 'forced-anna'),
    (bea, 'forced-bea');
  perform private.apply_movement(admin_id, 100, 'admin_adjustment');
  perform private.apply_movement(anna, 20, 'admin_adjustment');
  perform private.apply_movement(bea, 5, 'admin_adjustment');

  perform set_config('request.jwt.claims', jsonb_build_object('sub', admin_id, 'role', 'authenticated')::text, true);

  -- REQ-189: one player can't pay, so nobody is charged, and they're named.
  begin
    perform public.create_event(gen_random_uuid(), 'Prova', 10, array[anna, bea], 50, 30, 20, true);
    results := results || '{"REQ-189 a short player stops the event": "FAILED: accepted"}';
  exception when raise_exception then
    declare
      code text;
      named text;
    begin
      get stacked diagnostics code = message_text, named = pg_exception_detail;
      results := results || jsonb_build_object(
        'REQ-189 a short player stops the event',
        case when code = 'forced_insufficient_balance' and named = 'forced-bea' then 'passed' else 'FAILED: ' || code || ' ' || coalesce(named, '') end
      );
    end;
  end;

  results := results || jsonb_build_object(
    'REQ-189 nobody is charged',
    case when (select balance from public.profiles where user_id = anna) = 20
      and (select balance from public.profiles where user_id = bea) = 5
      and (select balance from public.profiles where user_id = admin_id) >= 100
      and not exists (select 1 from public.event_participants where user_id = anna)
    then 'passed' else 'FAILED' end
  );

  perform private.apply_movement(bea, 15, 'admin_adjustment');

  -- REQ-188: both are in and charged at once, with no invitation left to answer.
  forced_id := (public.create_event(request, 'Prova', 10, array[anna, bea], 50, 30, 20, true) ->> 'event_id')::uuid;
  repeat_id := (public.create_event(request, 'Prova', 10, array[anna, bea], 50, 30, 20, true) ->> 'event_id')::uuid;

  results := results || jsonb_build_object(
    'REQ-188 everyone is in and charged once',
    case when forced_id = repeat_id
      and (select balance from public.profiles where user_id = anna) = 10
      and (select balance from public.profiles where user_id = bea) = 10
      and (select count(*) from public.event_participants where event_id = forced_id and status = 'accepted') = 3
      and (select count(*) from public.event_participants where event_id = forced_id) = 3
    then 'passed' else 'FAILED' end
  );

  -- REQ-190: the player's balance moved, and the admin made the charge.
  results := results || jsonb_build_object(
    'REQ-190 the audit shows the admin',
    case when (
      select count(*)
      from public.ledger
      where event_id = forced_id and kind = 'event_buy_in' and delta = -10 and actor_id = admin_id
    ) = 3 then 'passed' else 'FAILED' end
  );

  -- REQ-188: a forced player has nothing to answer, so they can't withdraw.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', anna, 'role', 'authenticated')::text, true);

  begin
    perform public.answer_invitation(gen_random_uuid(), forced_id, false);
    results := results || '{"REQ-188 a forced player cannot withdraw": "FAILED: accepted"}';
  exception when raise_exception then
    results := results || '{"REQ-188 a forced player cannot withdraw": "passed"}';
  end;

  -- REQ-187: a player can't force, whatever the function is called with.
  begin
    perform public.create_event(gen_random_uuid(), 'Prova', 1, array[bea], 50, 30, 20, true);
    results := results || '{"REQ-187 a player cannot force": "FAILED: accepted"}';
  exception when insufficient_privilege then
    results := results || '{"REQ-187 a player cannot force": "passed"}';
  end;

  -- REQ-096: a forced player has accepted, so their removal is blocked.
  begin
    perform public.remove_profile(anna);
    results := results || '{"REQ-096 a forced player stays": "FAILED: accepted"}';
  exception when raise_exception then
    results := results || '{"REQ-096 a forced player stays": "passed"}';
  end;

  -- REQ-188: the admin can complete it without waiting.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  perform public.complete_event(gen_random_uuid(), forced_id, anna, bea, admin_id);

  select coalesce(sum(delta), 0) into charged
  from public.ledger
  where event_id = forced_id and kind = 'event_payout';

  results := results || jsonb_build_object(
    'REQ-188 the admin completes without waiting',
    case when charged = 30 and (select status from public.events where id = forced_id) = 'completed'
    then 'passed' else 'FAILED' end
  );

  raise exception 'RESULTS %', results;
end;
$$;
