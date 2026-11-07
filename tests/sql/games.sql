-- Game rules that need the real admin, who can't invite test accounts. Run this
-- through the Supabase MCP server's execute_sql, as the database owner.
--
-- It always ends by raising an exception, which rolls everything back and
-- carries the results in its message. Every entry should say "passed".
do $$
declare
  results jsonb := '{}';
  admin_id uuid := (select user_id from public.profiles where role = 'admin');
  anna uuid := gen_random_uuid();
  bea uuid := gen_random_uuid();
  cesc uuid := gen_random_uuid();
  admin_start bigint;
  duel uuid;
  request uuid := gen_random_uuid();
  defaults jsonb;
begin
  -- Says what a statement was refused with, or that it went through.
  create function pg_temp.refusal(statement text) returns text language plpgsql as $f$
  begin
    execute statement;
    return 'ACCEPTED';
  exception when others then
    return sqlerrm;
  end;
  $f$;

  create function pg_temp.verdict(name text, ok boolean) returns jsonb language sql as $f$
    select jsonb_build_object(name, case when ok then 'passed' else 'FAILED' end);
  $f$;

  create function pg_temp.act_as(who uuid) returns void language sql as $f$
    select set_config('request.jwt.claims', jsonb_build_object('sub', who, 'role', 'authenticated')::text, true);
  $f$;

  create function pg_temp.balance(who uuid) returns bigint language sql as $f$
    select balance from public.profiles where user_id = who;
  $f$;

  -- A duel between the two given players, with the admin out of it.
  create function pg_temp.new_duel(buy_in integer, a uuid, b uuid, forced boolean) returns uuid language sql as $f$
    select (public.create_game_event(gen_random_uuid(), 'confia_o_traeix', 'Prova', buy_in, false, array[a, b], forced) ->> 'event_id')::uuid;
  $f$;

  insert into auth.users (id, email) values
    (anna, 'games-anna@marcona.invalid'),
    (bea, 'games-bea@marcona.invalid'),
    (cesc, 'games-cesc@marcona.invalid');
  insert into public.profiles (user_id, username) values
    (anna, 'games-anna'),
    (bea, 'games-bea'),
    (cesc, 'games-cesc');
  perform private.apply_movement(admin_id, 1000, 'admin_adjustment');
  perform private.apply_movement(anna, 1000, 'admin_adjustment');
  perform private.apply_movement(bea, 1000, 'admin_adjustment');
  perform private.apply_movement(cesc, 5, 'admin_adjustment');
  admin_start := pg_temp.balance(admin_id);
  update public.games
  set settings = '{"both_trust": 150, "betrayer": 250, "betrayed": 0, "both_betray": 50}', enabled = true
  where id = 'confia_o_traeix';
  select settings into defaults from public.games where id = 'confia_o_traeix';

  -- REQ-176
  perform pg_temp.act_as(anna);
  results := results || pg_temp.verdict('REQ-176 a player cannot create a game', pg_temp.refusal(format(
    $s$select public.create_game_event(gen_random_uuid(), 'confia_o_traeix', 'Prova', 10, true, array[%L::uuid])$s$, bea
  )) = 'not_allowed');

  perform pg_temp.act_as(admin_id);

  -- REQ-121
  update public.games set enabled = false where id = 'confia_o_traeix';
  results := results || pg_temp.verdict('REQ-121 a game that is off is refused', pg_temp.refusal(format(
    $s$select public.create_game_event(gen_random_uuid(), 'confia_o_traeix', 'Prova', 10, true, array[%L::uuid])$s$, anna
  )) = 'game_off');
  update public.games set enabled = true where id = 'confia_o_traeix';

  -- REQ-178, REQ-179: the admin plays and pays, and the opponent is invited.
  duel := (public.create_game_event(request, 'confia_o_traeix', 'Prova', 10, true, array[anna]) ->> 'event_id')::uuid;
  results := results || pg_temp.verdict('REQ-179 the admin plays and pays', pg_temp.balance(admin_id) = admin_start - 10
    and (select status from public.event_participants where event_id = duel and user_id = admin_id) = 'accepted'
    and (select status from public.event_participants where event_id = duel and user_id = anna) = 'invited'
    and (select phase from public.events where id = duel) = 'inviting'
    and (select creator_plays from public.events where id = duel));

  -- REQ-062: the same request creates nothing new.
  results := results || pg_temp.verdict('REQ-062 a repeat creates one game',
    (public.create_game_event(request, 'confia_o_traeix', 'Prova', 10, true, array[anna]) ->> 'event_id')::uuid = duel
    and pg_temp.balance(admin_id) = admin_start - 10);

  -- REQ-122, REQ-123: the buy-in is the creator's, and the rules are a copy.
  results := results || pg_temp.verdict('REQ-122 the settings and description are copied',
    (select settings from public.events where id = duel)
      = defaults || jsonb_build_object('description', (select description from public.games where id = 'confia_o_traeix'))
    and (select buy_in from public.events where id = duel) = 10
    and (select type from public.events where id = duel) = 'game'
    and (select game from public.events where id = duel) = 'confia_o_traeix');

  -- REQ-180: more than the admin has, and nothing stays behind.
  results := results || pg_temp.verdict('REQ-180 a short admin creates nothing', pg_temp.refusal(format(
    $s$select public.create_game_event(gen_random_uuid(), 'confia_o_traeix', 'Sense saldo', %s, true, array[%L::uuid])$s$,
    pg_temp.balance(admin_id) + 1, anna
  )) = 'insufficient_balance' and not exists (select 1 from public.events where name = 'Sense saldo'));

  -- REQ-181: the admin isn't charged, and isn't a player.
  admin_start := pg_temp.balance(admin_id);
  duel := pg_temp.new_duel(10, anna, bea, false);
  results := results || pg_temp.verdict('REQ-181 the admin runs a game without playing', pg_temp.balance(admin_id) = admin_start
    and not exists (select 1 from public.event_participants where event_id = duel and user_id = admin_id)
    and (select count(*) from public.event_participants where event_id = duel and status = 'invited') = 2
    and not (select creator_plays from public.events where id = duel));

  -- REQ-182: exactly two different players.
  results := results || pg_temp.verdict('REQ-182 the admin plays and invites two', pg_temp.refusal(format(
    $s$select public.create_game_event(gen_random_uuid(), 'confia_o_traeix', 'Prova', 10, true, array[%L::uuid, %L::uuid])$s$, anna, bea
  )) = 'duel_needs_two_players');
  results := results || pg_temp.verdict('REQ-182 the admin stays out and invites one', pg_temp.refusal(format(
    $s$select public.create_game_event(gen_random_uuid(), 'confia_o_traeix', 'Prova', 10, false, array[%L::uuid])$s$, anna
  )) = 'duel_needs_two_players');
  results := results || pg_temp.verdict('REQ-182 the admin stays out and invites three', pg_temp.refusal(format(
    $s$select public.create_game_event(gen_random_uuid(), 'confia_o_traeix', 'Prova', 10, false, array[%L::uuid, %L::uuid, %L::uuid])$s$, anna, bea, cesc
  )) = 'duel_needs_two_players');
  results := results || pg_temp.verdict('REQ-182 the same person twice', pg_temp.refusal(format(
    $s$select public.create_game_event(gen_random_uuid(), 'confia_o_traeix', 'Prova', 10, false, array[%L::uuid, %L::uuid])$s$, anna, anna
  )) = 'duel_needs_two_players');
  results := results || pg_temp.verdict('REQ-182 the admin cannot invite themselves', pg_temp.refusal(format(
    $s$select public.create_game_event(gen_random_uuid(), 'confia_o_traeix', 'Prova', 10, false, array[%L::uuid, %L::uuid])$s$, admin_id, anna
  )) = 'invalid_invitee');

  -- REQ-191: both pay, and it goes straight to choosing.
  duel := pg_temp.new_duel(10, anna, bea, true);
  results := results || pg_temp.verdict('REQ-191 a forced duel starts at once',
    (select phase from public.events where id = duel) = 'choosing'
    and (select count(*) from public.event_participants where event_id = duel and status = 'accepted') = 2
    and (select count(*) from public.ledger where event_id = duel and kind = 'event_buy_in' and delta = -10 and actor_id = admin_id) = 2);

  -- REQ-189: all or nothing, and the short player is named.
  results := results || pg_temp.verdict('REQ-189 a short forced player stops the duel', pg_temp.refusal(format(
    $s$select public.create_game_event(gen_random_uuid(), 'confia_o_traeix', 'Prova', 10, false, array[%L::uuid, %L::uuid], true)$s$, anna, cesc
  )) = 'forced_insufficient_balance');

  -- NEXT

  raise exception 'RESULTS %', results;
end;
$$;
