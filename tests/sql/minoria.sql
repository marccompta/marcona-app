-- La minoria's rules, which need the real admin, who can't invite test accounts.
-- Run this through the Supabase MCP server's execute_sql, as the database owner.
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
  ester uuid := gen_random_uuid();
  ferran uuid := gen_random_uuid();
  gina uuid := gen_random_uuid();
  pobre uuid := gen_random_uuid();
  admin_start bigint;
  round uuid;
  defaults jsonb;
  game_description text;
  cesc_start bigint;
  request uuid;
  outcome jsonb;
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

  create function pg_temp.status(event uuid, who uuid) returns text language sql as $f$
    select status from public.event_participants where event_id = event and user_id = who;
  $f$;

  -- A game of La minoria for the given players, created by the admin.
  create function pg_temp.new_game(buy_in integer, plays boolean, players uuid[], forced boolean) returns uuid language sql as $f$
    select (public.create_game_event(gen_random_uuid(), 'la_minoria', 'Prova', buy_in, plays, players, forced) ->> 'event_id')::uuid;
  $f$;

  insert into auth.users (id, email)
  select id, 'minoria-' || name || '@marcona.invalid'
  from unnest(array[anna, bea, cesc, dani, ester, ferran, gina, pobre],
    array['anna', 'bea', 'cesc', 'dani', 'ester', 'ferran', 'gina', 'pobre']) as person (id, name);
  insert into public.profiles (user_id, username)
  select id, 'minoria-' || name
  from unnest(array[anna, bea, cesc, dani, ester, ferran, gina, pobre],
    array['anna', 'bea', 'cesc', 'dani', 'ester', 'ferran', 'gina', 'pobre']) as person (id, name);
  perform private.apply_movement(admin_id, 1000, 'admin_adjustment');
  perform private.apply_movement(person, 1000, 'admin_adjustment')
  from unnest(array[anna, bea, cesc, dani, ester, ferran, gina]) as person;
  perform private.apply_movement(pobre, 3, 'admin_adjustment');

  -- Never assume the live settings: the admin changes them during reviews.
  update public.games set enabled = true where id in ('la_minoria', 'confia_o_traeix');
  select settings, games.description into defaults, game_description from public.games where id = 'la_minoria';

  -- REQ-193: the seed's labels.
  results := results || pg_temp.verdict('REQ-193 the labels start as Blanc and Negre',
    defaults = '{"option_a": "Blanc", "option_b": "Negre"}'::jsonb);

  -- REQ-155: only the admin, as with every game.
  perform pg_temp.act_as(anna);
  results := results || pg_temp.verdict('REQ-155 a player cannot create La minoria', pg_temp.refusal(format(
    $s$select public.create_game_event(gen_random_uuid(), 'la_minoria', 'Prova', 10, true, array[%L::uuid, %L::uuid])$s$, bea, cesc
  )) = 'not_allowed');

  perform pg_temp.act_as(admin_id);

  -- REQ-155, REQ-185: three players, counting the admin only if they play.
  admin_start := pg_temp.balance(admin_id);
  round := pg_temp.new_game(10, true, array[anna, bea], false);
  results := results || pg_temp.verdict('REQ-185 the admin who plays counts towards 3',
    (select phase from public.events where id = round) = 'inviting'
    and pg_temp.status(round, admin_id) = 'accepted'
    and pg_temp.status(round, anna) = 'invited'
    and pg_temp.balance(admin_id) = admin_start - 10);

  results := results || pg_temp.verdict('REQ-185 the admin who does not play does not count', pg_temp.refusal(format(
    $s$select public.create_game_event(gen_random_uuid(), 'la_minoria', 'Prova', 10, false, array[%L::uuid, %L::uuid])$s$, anna, bea
  )) = 'minoria_needs_three_players');
  results := results || pg_temp.verdict('REQ-155 the admin and one other is too few', pg_temp.refusal(format(
    $s$select public.create_game_event(gen_random_uuid(), 'la_minoria', 'Prova', 10, true, array[%L::uuid])$s$, anna
  )) = 'minoria_needs_three_players');
  results := results || pg_temp.verdict('REQ-155 a name twice counts once', pg_temp.refusal(format(
    $s$select public.create_game_event(gen_random_uuid(), 'la_minoria', 'Prova', 10, false, array[%L::uuid, %L::uuid, %L::uuid])$s$, anna, bea, bea
  )) = 'minoria_needs_three_players');

  admin_start := pg_temp.balance(admin_id);
  round := pg_temp.new_game(10, false, array[anna, bea, cesc], false);
  results := results || pg_temp.verdict('REQ-155 three invited players without the admin',
    (select count(*) from public.event_participants where event_id = round and status = 'invited') = 3
    and not exists (select 1 from public.event_participants where event_id = round and user_id = admin_id)
    and pg_temp.balance(admin_id) = admin_start);
  results := results || pg_temp.verdict('REQ-155 more than three is fine',
    pg_temp.new_game(10, true, array[anna, bea, cesc, dani, ester, ferran, gina], false) is not null);

  -- REQ-160: the labels are copied with the description.
  results := results || pg_temp.verdict('REQ-160 the labels are copied',
    (select settings from public.events where id = round) = defaults || jsonb_build_object('description', game_description));

  -- A decline is only a decline: the game waits for the start.
  perform pg_temp.act_as(anna);
  perform public.answer_invitation(gen_random_uuid(), round, true);
  perform pg_temp.act_as(bea);
  perform public.answer_invitation(gen_random_uuid(), round, false);
  results := results || pg_temp.verdict('A decline leaves La minoria open',
    (select status from public.events where id = round) = 'open'
    and pg_temp.status(round, bea) = 'declined'
    and pg_temp.status(round, cesc) = 'invited');
  perform pg_temp.act_as(cesc);
  perform public.answer_invitation(gen_random_uuid(), round, true);
  results := results || pg_temp.verdict('The last answer does not start La minoria',
    (select phase from public.events where id = round) = 'inviting');

  -- A removal is only a decline too.
  perform pg_temp.act_as(admin_id);
  round := pg_temp.new_game(10, true, array[anna, bea, dani], false);
  perform public.remove_profile(dani);
  results := results || pg_temp.verdict('A removal leaves La minoria open',
    (select status from public.events where id = round) = 'open'
    and pg_temp.status(round, dani) = 'declined');

  -- REQ-192: everyone pays, and it starts at once.
  perform pg_temp.act_as(admin_id);
  round := pg_temp.new_game(10, false, array[anna, bea, cesc], true);
  results := results || pg_temp.verdict('REQ-192 a forced game starts at once',
    (select phase from public.events where id = round) = 'choosing'
    and (select count(*) from public.event_participants where event_id = round and status = 'accepted') = 3
    and (select count(*) from public.ledger where event_id = round and kind = 'event_buy_in' and delta = -10 and actor_id = admin_id) = 3);
  results := results || pg_temp.verdict('REQ-189 a short forced player stops La minoria', pg_temp.refusal(format(
    $s$select public.create_game_event(gen_random_uuid(), 'la_minoria', 'Prova', 10, false, array[%L::uuid, %L::uuid, %L::uuid], true)$s$, anna, bea, pobre
  )) = 'forced_insufficient_balance');

  -- REQ-182: the duel's own count is still there.
  results := results || pg_temp.verdict('REQ-182 a duel still needs exactly two', pg_temp.refusal(format(
    $s$select public.create_game_event(gen_random_uuid(), 'confia_o_traeix', 'Prova', 10, false, array[%L::uuid, %L::uuid, %L::uuid])$s$, anna, bea, cesc
  )) = 'duel_needs_two_players');

  -- REQ-156, REQ-185: the admin plays, and 2 others have paid.
  perform pg_temp.act_as(admin_id);
  round := pg_temp.new_game(10, true, array[anna, bea, cesc], false);
  perform pg_temp.act_as(anna);
  perform public.answer_invitation(gen_random_uuid(), round, true);
  perform pg_temp.act_as(bea);
  perform public.answer_invitation(gen_random_uuid(), round, true);
  cesc_start := pg_temp.balance(cesc);

  -- REQ-157: only the creator, even once there are enough.
  perform pg_temp.act_as(anna);
  results := results || pg_temp.verdict('REQ-157 a player cannot start it', pg_temp.refusal(format(
    $s$select public.start_game(gen_random_uuid(), %L)$s$, round
  )) = 'not_allowed' and (select phase from public.events where id = round) = 'inviting');

  -- REQ-156, REQ-158: cesc hasn't answered, so their invitation lapses unpaid.
  perform pg_temp.act_as(admin_id);
  request := gen_random_uuid();
  outcome := public.start_game(request, round);
  results := results || pg_temp.verdict('REQ-156 the admin who plays and 2 others can start',
    outcome ->> 'event_id' = round::text
    and (select phase from public.events where id = round) = 'choosing'
    and (select status from public.events where id = round) = 'open');
  results := results || pg_temp.verdict('REQ-158 a pending invitation lapses at the start',
    pg_temp.status(round, cesc) = 'lapsed' and pg_temp.balance(cesc) = cesc_start
    and not exists (select 1 from public.ledger where event_id = round and user_id = cesc));
  perform pg_temp.act_as(cesc);
  results := results || pg_temp.verdict('REQ-158 a lapsed invitation cannot be accepted', pg_temp.refusal(format(
    $s$select public.answer_invitation(gen_random_uuid(), %L, true)$s$, round
  )) = 'invitation_not_pending');

  -- REQ-062: a repeat returns the first answer, and a new request finds it started.
  perform pg_temp.act_as(admin_id);
  results := results || pg_temp.verdict('REQ-062 a repeated start returns the first answer',
    public.start_game(request, round) = outcome);
  results := results || pg_temp.verdict('A game starts only once', pg_temp.refusal(format(
    $s$select public.start_game(gen_random_uuid(), %L)$s$, round
  )) = 'game_not_inviting');

  -- REQ-156, REQ-185: without the admin, 3 who have paid can start.
  round := pg_temp.new_game(10, false, array[anna, bea, cesc, ester], false);
  perform pg_temp.act_as(anna);
  perform public.answer_invitation(gen_random_uuid(), round, true);
  perform pg_temp.act_as(bea);
  perform public.answer_invitation(gen_random_uuid(), round, true);

  -- REQ-157, REQ-185: 2 who have paid, and an admin who isn't playing, are too few.
  perform pg_temp.act_as(admin_id);
  results := results || pg_temp.verdict('REQ-157 2 players and an admin who does not play cannot start', pg_temp.refusal(format(
    $s$select public.start_game(gen_random_uuid(), %L)$s$, round
  )) = 'not_enough_players' and (select phase from public.events where id = round) = 'inviting');
  perform pg_temp.act_as(cesc);
  perform public.answer_invitation(gen_random_uuid(), round, true);
  perform pg_temp.act_as(admin_id);
  perform public.start_game(gen_random_uuid(), round);
  results := results || pg_temp.verdict('REQ-156 3 players without the admin can start',
    (select phase from public.events where id = round) = 'choosing'
    and pg_temp.status(round, ester) = 'lapsed');

  -- Nothing else has a start.
  round := (public.create_game_event(gen_random_uuid(), 'confia_o_traeix', 'Prova', 10, false, array[anna, bea]) ->> 'event_id')::uuid;
  results := results || pg_temp.verdict('A duel has no start', pg_temp.refusal(format(
    $s$select public.start_game(gen_random_uuid(), %L)$s$, round
  )) = 'game_has_no_start');
  round := pg_temp.new_game(10, true, array[anna, bea], false);
  perform public.cancel_event(gen_random_uuid(), round);
  results := results || pg_temp.verdict('A cancelled game cannot start', pg_temp.refusal(format(
    $s$select public.start_game(gen_random_uuid(), %L)$s$, round
  )) = 'event_not_open');

  raise exception 'RESULTS %', results;
end;
$$;
