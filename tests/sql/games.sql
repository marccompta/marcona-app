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
  dani uuid := gen_random_uuid();
  tess uuid := gen_random_uuid();
  admin_start bigint;
  duel uuid;
  request uuid := gen_random_uuid();
  defaults jsonb;
  outcome jsonb;
  scenario text;
  state_before jsonb;
  public_before text;
  movements_before bigint;
  parts text[];
  anna_start bigint;
  bea_start bigint;
  second_duel uuid;
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
    (cesc, 'games-cesc@marcona.invalid'),
    (dani, 'games-dani@marcona.invalid');
  insert into auth.users (id, email) values (tess, 'games-tess@marcona.invalid');
  insert into public.profiles (user_id, username, is_test) values (tess, 'games-tess', true);
  insert into public.profiles (user_id, username) values
    (anna, 'games-anna'),
    (bea, 'games-bea'),
    (cesc, 'games-cesc'),
    (dani, 'games-dani');
  perform private.apply_movement(admin_id, 1000, 'admin_adjustment');
  perform private.apply_movement(anna, 1000, 'admin_adjustment');
  perform private.apply_movement(bea, 1000, 'admin_adjustment');
  perform private.apply_movement(cesc, 5, 'admin_adjustment');
  perform private.apply_movement(dani, 1000, 'admin_adjustment');
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

  -- REQ-124: nobody picks a game's winner, not even its creator.
  duel := pg_temp.new_duel(10, anna, bea, true);
  results := results || pg_temp.verdict('REQ-124 the creator cannot complete a game', pg_temp.refusal(format(
    $s$select public.complete_event(gen_random_uuid(), %L, %L, null, null)$s$, duel, anna
  )) = 'game_decides_winners');
  perform pg_temp.act_as(anna);
  results := results || pg_temp.verdict('REQ-124 a player cannot complete a game', pg_temp.refusal(format(
    $s$select public.complete_event(gen_random_uuid(), %L, %L, null, null)$s$, duel, anna
  )) = 'game_decides_winners');
  perform pg_temp.act_as(admin_id);
  results := results || pg_temp.verdict('REQ-124 the game is still open',
    (select status from public.events where id = duel) = 'open');

  -- The second acceptance starts the choosing, and the first doesn't.
  duel := pg_temp.new_duel(10, anna, bea, false);
  perform pg_temp.act_as(anna);
  perform public.answer_invitation(gen_random_uuid(), duel, true);
  results := results || pg_temp.verdict('A duel waits for both to pay',
    (select phase from public.events where id = duel) = 'inviting');
  perform pg_temp.act_as(bea);
  perform public.answer_invitation(gen_random_uuid(), duel, true);
  results := results || pg_temp.verdict('A duel starts when both have paid',
    (select phase from public.events where id = duel) = 'choosing');

  -- REQ-183: a decline ends the duel, and whoever paid gets it back.
  perform pg_temp.act_as(admin_id);
  duel := pg_temp.new_duel(10, anna, bea, false);
  perform pg_temp.act_as(anna);
  perform public.answer_invitation(gen_random_uuid(), duel, true);
  admin_start := pg_temp.balance(anna);
  perform pg_temp.act_as(bea);
  perform public.answer_invitation(gen_random_uuid(), duel, false);
  results := results || pg_temp.verdict('REQ-183 a decline cancels and refunds',
    (select status from public.events where id = duel) = 'cancelled'
    and pg_temp.balance(anna) = admin_start + 10
    and (select status from public.event_participants where event_id = duel and user_id = bea) = 'declined');

  -- REQ-183: with nobody paid, the other invitation lapses.
  perform pg_temp.act_as(admin_id);
  duel := pg_temp.new_duel(10, anna, bea, false);
  perform pg_temp.act_as(bea);
  perform public.answer_invitation(gen_random_uuid(), duel, false);
  results := results || pg_temp.verdict('REQ-183 a first decline lapses the other invitation',
    (select status from public.events where id = duel) = 'cancelled'
    and (select status from public.event_participants where event_id = duel and user_id = anna) = 'lapsed');

  -- REQ-183: the admin paid to play, and their opponent says no.
  perform pg_temp.act_as(admin_id);
  admin_start := pg_temp.balance(admin_id);
  duel := (public.create_game_event(gen_random_uuid(), 'confia_o_traeix', 'Prova', 10, true, array[anna]) ->> 'event_id')::uuid;
  perform pg_temp.act_as(anna);
  perform public.answer_invitation(gen_random_uuid(), duel, false);
  results := results || pg_temp.verdict('REQ-183 the admin is refunded', pg_temp.balance(admin_id) = admin_start);

  -- REQ-184: removing an invited player ends the duel, and anyone paid gets it back.
  perform pg_temp.act_as(admin_id);
  duel := pg_temp.new_duel(10, anna, dani, false);
  perform pg_temp.act_as(anna);
  perform public.answer_invitation(gen_random_uuid(), duel, true);
  admin_start := pg_temp.balance(anna);
  perform pg_temp.act_as(admin_id);

  -- REQ-096: someone who has paid into a duel still blocks their own removal.
  results := results || pg_temp.verdict('REQ-096 a paid player stays', pg_temp.refusal(format(
    $s$select public.remove_profile(%L)$s$, anna
  )) = 'user_in_open_event');

  perform public.remove_profile(dani);
  results := results || pg_temp.verdict('REQ-184 a removal cancels and refunds',
    (select status from public.events where id = duel) = 'cancelled'
    and pg_temp.balance(anna) = admin_start + 10
    and (select status from public.event_participants where event_id = duel and user_id = dani) = 'declined'
    and (select removed_at from public.profiles where user_id = dani) is not null);

  -- REQ-125: only a player, only while choosing, and only a real choice.
  perform pg_temp.act_as(admin_id);
  duel := pg_temp.new_duel(10, anna, bea, false);
  perform pg_temp.act_as(anna);
  results := results || pg_temp.verdict('REQ-125 nobody locks in before both have paid', pg_temp.refusal(format(
    $s$select public.lock_in(gen_random_uuid(), %L, 'confia')$s$, duel
  )) = 'not_allowed');
  perform public.answer_invitation(gen_random_uuid(), duel, true);
  results := results || pg_temp.verdict('REQ-125 a paid player still waits for the other', pg_temp.refusal(format(
    $s$select public.lock_in(gen_random_uuid(), %L, 'confia')$s$, duel
  )) = 'game_not_choosing');

  perform pg_temp.act_as(admin_id);
  duel := pg_temp.new_duel(10, anna, bea, true);
  results := results || pg_temp.verdict('REQ-125 the admin who is not playing cannot lock in', pg_temp.refusal(format(
    $s$select public.lock_in(gen_random_uuid(), %L, 'confia')$s$, duel
  )) = 'not_allowed');
  perform pg_temp.act_as(cesc);
  results := results || pg_temp.verdict('REQ-125 an outsider cannot lock in', pg_temp.refusal(format(
    $s$select public.lock_in(gen_random_uuid(), %L, 'confia')$s$, duel
  )) = 'not_allowed');
  perform pg_temp.act_as(anna);
  results := results || pg_temp.verdict('REQ-139 only Confia or Traeix', pg_temp.refusal(format(
    $s$select public.lock_in(gen_random_uuid(), %L, 'blanc')$s$, duel
  )) = 'invalid_game_choice');

  -- REQ-202: each tap replaces the last, and a repeat of the same tap changes nothing.
  request := gen_random_uuid();
  outcome := public.lock_in(request, duel, 'confia');
  results := results || pg_temp.verdict('REQ-202 a tap is saved', (outcome ->> 'saved')::boolean
    and not (outcome ->> 'revealed')::boolean
    and (select choice from private.choices where event_id = duel and user_id = anna) = 'confia');
  perform public.lock_in(gen_random_uuid(), duel, 'traeix');
  results := results || pg_temp.verdict('REQ-202 the last tap counts',
    (select choice from private.choices where event_id = duel and user_id = anna) = 'traeix'
    and (select count(*) from private.choices where event_id = duel) = 1);
  perform public.lock_in(request, duel, 'confia');
  results := results || pg_temp.verdict('REQ-062 a repeat of an old tap changes nothing',
    (select choice from private.choices where event_id = duel and user_id = anna) = 'traeix');

  -- REQ-140 to REQ-143: the spec's table, with a buy-in of 11.
  foreach scenario in array array[
    'confia,confia,16,16', 'traeix,confia,27,0', 'confia,traeix,0,27', 'traeix,traeix,5,5'
  ] loop
    parts := string_to_array(scenario, ',');
    perform pg_temp.act_as(admin_id);
    duel := pg_temp.new_duel(11, anna, bea, true);
    anna_start := pg_temp.balance(anna);
    bea_start := pg_temp.balance(bea);
    perform pg_temp.act_as(anna);
    perform public.lock_in(gen_random_uuid(), duel, parts[1]);
    perform pg_temp.act_as(bea);
    outcome := public.lock_in(gen_random_uuid(), duel, parts[2]);
    results := results || pg_temp.verdict('REQ-140 to REQ-143 ' || scenario,
      (outcome ->> 'revealed')::boolean
      and pg_temp.balance(anna) = anna_start + parts[3]::bigint
      and pg_temp.balance(bea) = bea_start + parts[4]::bigint);

    -- REQ-127, REQ-132: the reveal holds every choice and payout, the 0 included.
    results := results || pg_temp.verdict('REQ-127 revealed and completed ' || scenario,
      (select status = 'completed' and phase = 'revealed' from public.events where id = duel)
      and (select count(*) from jsonb_array_elements((select reveal -> 'players' from public.events where id = duel))) = 2
      and exists (
        select 1
        from jsonb_array_elements((select reveal -> 'players' from public.events where id = duel)) as player
        where player ->> 'user_id' = bea::text and player ->> 'choice' = parts[2] and (player ->> 'payout')::bigint = parts[4]::bigint
      ));

    -- REQ-145: ordinary movements, and a payout of 0 writes none.
    results := results || pg_temp.verdict('REQ-145 payouts are movements ' || scenario,
      (select count(*) from public.ledger where event_id = duel and kind = 'event_payout')
        = (case when parts[3]::bigint > 0 then 1 else 0 end) + (case when parts[4]::bigint > 0 then 1 else 0 end)
      and not exists (select 1 from public.ledger where event_id = duel and kind = 'event_payout' and actor_id <> admin_id));
  end loop;

  -- REQ-204: a late tap changes nothing, and asks for the reveal.
  perform pg_temp.act_as(anna);
  anna_start := pg_temp.balance(anna);
  outcome := public.lock_in(gen_random_uuid(), duel, 'confia');
  results := results || pg_temp.verdict('REQ-204 a late tap changes nothing',
    not (outcome ->> 'saved')::boolean and (outcome ->> 'revealed')::boolean
    and pg_temp.balance(anna) = anna_start
    and (select choice from private.choices where event_id = duel and user_id = anna) = 'traeix');

  -- REQ-139: the admin plays, and betrays.
  perform pg_temp.act_as(admin_id);
  duel := (public.create_game_event(gen_random_uuid(), 'confia_o_traeix', 'Prova', 10, true, array[anna], false) ->> 'event_id')::uuid;
  perform pg_temp.act_as(anna);
  perform public.answer_invitation(gen_random_uuid(), duel, true);
  perform pg_temp.act_as(admin_id);
  admin_start := pg_temp.balance(admin_id);
  perform public.lock_in(gen_random_uuid(), duel, 'traeix');
  perform pg_temp.act_as(anna);
  perform public.lock_in(gen_random_uuid(), duel, 'confia');
  results := results || pg_temp.verdict('REQ-139 the admin can play', pg_temp.balance(admin_id) = admin_start + 25);

  -- REQ-122, REQ-149: a running duel keeps the old numbers, and a new one gets the new.
  perform pg_temp.act_as(admin_id);
  duel := pg_temp.new_duel(10, anna, bea, true);
  update public.games set settings = settings || '{"both_trust": 120}' where id = 'confia_o_traeix';
  second_duel := pg_temp.new_duel(10, anna, bea, true);
  anna_start := pg_temp.balance(anna);
  perform pg_temp.act_as(anna);
  perform public.lock_in(gen_random_uuid(), duel, 'confia');
  perform public.lock_in(gen_random_uuid(), second_duel, 'confia');
  perform pg_temp.act_as(bea);
  perform public.lock_in(gen_random_uuid(), duel, 'confia');
  perform public.lock_in(gen_random_uuid(), second_duel, 'confia');
  results := results || pg_temp.verdict('REQ-149 settings changes leave running games alone',
    (select sum(delta) from public.ledger where event_id = duel and user_id = anna and kind = 'event_payout') = 15
    and (select sum(delta) from public.ledger where event_id = second_duel and user_id = anna and kind = 'event_payout') = 12
    and pg_temp.balance(anna) = anna_start + 27);
  update public.games set settings = defaults where id = 'confia_o_traeix';

  -- REQ-128, REQ-194: game_state() says the same to everyone, and a lock-in changes
  -- nothing it returns or any public row. Hosted tests repeat this through the API.
  perform pg_temp.act_as(admin_id);
  duel := pg_temp.new_duel(10, anna, bea, true);
  state_before := public.game_state(duel);
  public_before := (
    select md5(row(event.*)::text || (select string_agg(row(participant.*)::text, ',' order by participant.user_id)
      from public.event_participants as participant where participant.event_id = event.id))
    from public.events as event where event.id = duel
  );
  movements_before := (select count(*) from public.ledger);

  perform pg_temp.act_as(anna);
  results := results || pg_temp.verdict('REQ-194 everyone reads the same', public.game_state(duel) = state_before);
  perform public.lock_in(gen_random_uuid(), duel, 'confia');
  results := results || pg_temp.verdict('REQ-194 the player who locked in reads the same', public.game_state(duel) = state_before);
  perform pg_temp.act_as(bea);
  results := results || pg_temp.verdict('REQ-194 the other player reads the same', public.game_state(duel) = state_before);
  perform pg_temp.act_as(admin_id);
  results := results || pg_temp.verdict('REQ-194 the admin reads the same', public.game_state(duel) = state_before);
  results := results || pg_temp.verdict('REQ-194 no public row changes', public_before = (
    select md5(row(event.*)::text || (select string_agg(row(participant.*)::text, ',' order by participant.user_id)
      from public.event_participants as participant where participant.event_id = event.id))
    from public.events as event where event.id = duel
  ) and movements_before = (select count(*) from public.ledger));
  results := results || pg_temp.verdict('REQ-128 the state holds no choice',
    state_before -> 'reveal' = 'null'::jsonb and state_before::text not like '%"choice"%');

  -- REQ-128: out of every API role's reach, and in no Realtime publication.
  results := results || pg_temp.verdict('REQ-128 no API role can read choices',
    not has_table_privilege('anon', 'private.choices', 'select')
    and not has_table_privilege('authenticated', 'private.choices', 'select')
    and not has_table_privilege('service_role', 'private.choices', 'select'));
  results := results || pg_temp.verdict('REQ-128 choices are not published to Realtime',
    not exists (select 1 from pg_publication_tables where schemaname = 'private'));
  results := results || pg_temp.verdict('REQ-128 Row Level Security is on for choices',
    (select relrowsecurity from pg_class where oid = 'private.choices'::regclass));

  -- Test accounts see only their own, here as on the events table.
  perform pg_temp.act_as(tess);
  results := results || pg_temp.verdict('A test account cannot read a real game', pg_temp.refusal(format(
    $s$select public.game_state(%L)$s$, duel
  )) = 'event_not_found');

  -- REQ-132: the same function gives the full result after the reveal.
  perform pg_temp.act_as(bea);
  perform public.lock_in(gen_random_uuid(), duel, 'traeix');
  outcome := public.game_state(duel);
  results := results || pg_temp.verdict('REQ-132 after the reveal it shows everything',
    outcome ->> 'phase' = 'revealed' and jsonb_array_length(outcome -> 'reveal' -> 'players') = 2);

  -- REQ-135: a stuck duel, with one player locked in. Both get it all back.
  perform pg_temp.act_as(admin_id);
  duel := pg_temp.new_duel(10, anna, bea, true);
  anna_start := pg_temp.balance(anna);
  bea_start := pg_temp.balance(bea);
  perform pg_temp.act_as(anna);
  perform public.lock_in(gen_random_uuid(), duel, 'traeix');
  results := results || pg_temp.verdict('REQ-135 a player cannot cancel', pg_temp.refusal(format(
    $s$select public.cancel_event(gen_random_uuid(), %L)$s$, duel
  )) = 'not_allowed');
  perform pg_temp.act_as(admin_id);
  perform public.cancel_event(gen_random_uuid(), duel);
  results := results || pg_temp.verdict('REQ-135 cancelling refunds both players',
    pg_temp.balance(anna) = anna_start + 10 and pg_temp.balance(bea) = bea_start + 10
    and (select status from public.events where id = duel) = 'cancelled'
    and (select reveal from public.events where id = duel) is null);
  perform pg_temp.act_as(bea);
  results := results || pg_temp.verdict('REQ-135 nobody locks in after a cancel', pg_temp.refusal(format(
    $s$select public.lock_in(gen_random_uuid(), %L, 'confia')$s$, duel
  )) = 'event_not_open');
  results := results || pg_temp.verdict('REQ-128 a cancelled game reveals nothing',
    public.game_state(duel) -> 'reveal' = 'null'::jsonb);

  -- REQ-144: only the admin, and only numbers in the right order.
  perform pg_temp.act_as(anna);
  results := results || pg_temp.verdict('REQ-146 a player cannot change a game', pg_temp.refusal(
    $s$select public.set_game_settings('confia_o_traeix', false, 'Prova', '{"both_trust": 150, "betrayer": 250, "betrayed": 0, "both_betray": 50}')$s$
  ) = 'not_allowed');
  perform pg_temp.act_as(admin_id);

  foreach scenario in array array[
    '{"both_trust": 40, "betrayer": 250, "betrayed": 0, "both_betray": 50}',
    '{"both_trust": 250, "betrayer": 250, "betrayed": 0, "both_betray": 50}',
    '{"both_trust": 300, "betrayer": 250, "betrayed": 0, "both_betray": 50}',
    '{"both_trust": 150, "betrayer": 250, "betrayed": 60, "both_betray": 50}',
    '{"both_trust": 150, "betrayer": 250, "betrayed": 150, "both_betray": 150}'
  ] loop
    results := results || pg_temp.verdict('REQ-144 refused ' || scenario, pg_temp.refusal(format(
      $s$select public.set_game_settings('confia_o_traeix', true, 'Prova', %L)$s$, scenario
    )) = 'invalid_duel_order');
  end loop;

  foreach scenario in array array[
    '{"both_trust": 150.5, "betrayer": 250, "betrayed": 0, "both_betray": 50}',
    '{"both_trust": 150, "betrayer": 1001, "betrayed": 0, "both_betray": 50}',
    '{"both_trust": 150, "betrayer": 250, "betrayed": -1, "both_betray": 50}',
    '{"both_trust": "150", "betrayer": 250, "betrayed": 0, "both_betray": 50}',
    '{"betrayer": 250, "betrayed": 0, "both_betray": 50}'
  ] loop
    results := results || pg_temp.verdict('REQ-144 not a percentage ' || scenario, pg_temp.refusal(format(
      $s$select public.set_game_settings('confia_o_traeix', true, 'Prova', %L)$s$, scenario
    )) = 'invalid_game_percentage');
  end loop;

  results := results || pg_temp.verdict('REQ-144 the settings have not changed',
    (select settings from public.games where id = 'confia_o_traeix') = defaults);

  results := results || pg_temp.verdict('REQ-147 a description is required', pg_temp.refusal(format(
    $s$select public.set_game_settings('confia_o_traeix', true, '   ', %L)$s$, defaults
  )) = 'game_description_required');
  results := results || pg_temp.verdict('REQ-147 a description has a limit', pg_temp.refusal(format(
    $s$select public.set_game_settings('confia_o_traeix', true, %L, %L)$s$, repeat('a', 1001), defaults
  )) = 'game_description_too_long');

  -- REQ-144: the edge of the rule, where both betray and betrayed may be equal.
  perform public.set_game_settings(
    'confia_o_traeix', true, '  Regles noves.  ',
    '{"both_trust": 120, "betrayer": 300, "betrayed": 20, "both_betray": 20, "extra": 1}'
  );
  results := results || pg_temp.verdict('REQ-147 the admin edits a game',
    (select description from public.games where id = 'confia_o_traeix') = 'Regles noves.'
    and (select settings from public.games where id = 'confia_o_traeix')
      = '{"both_trust": 120, "betrayer": 300, "betrayed": 20, "both_betray": 20}'::jsonb);

  -- REQ-147: a new game takes the new text and numbers, and an old one keeps its own.
  second_duel := pg_temp.new_duel(10, anna, bea, true);
  results := results || pg_temp.verdict('REQ-147 new events use the edit',
    (select settings ->> 'description' from public.events where id = second_duel) = 'Regles noves.'
    and (select (settings ->> 'both_trust')::integer from public.events where id = second_duel) = 120
    and (select settings ->> 'description' from public.events where id = duel) <> 'Regles noves.');

  -- REQ-146: off stops new events, and leaves a running one alone.
  perform public.set_game_settings('confia_o_traeix', false, 'Regles noves.', defaults);
  results := results || pg_temp.verdict('REQ-146 off stops new events', pg_temp.refusal(format(
    $s$select public.create_game_event(gen_random_uuid(), 'confia_o_traeix', 'Prova', 10, false, array[%L::uuid, %L::uuid], true)$s$, anna, bea
  )) = 'game_off');
  perform pg_temp.act_as(anna);
  perform public.lock_in(gen_random_uuid(), second_duel, 'confia');
  perform pg_temp.act_as(bea);
  results := results || pg_temp.verdict('REQ-149 a running game plays on',
    (public.lock_in(gen_random_uuid(), second_duel, 'confia') ->> 'revealed')::boolean);

  raise exception 'RESULTS %', results;
end;
$$;
