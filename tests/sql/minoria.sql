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
  tess uuid := gen_random_uuid();
  admin_start bigint;
  round uuid;
  defaults jsonb;
  game_description text;
  cesc_start bigint;
  request uuid;
  outcome jsonb;
  anna_start bigint;
  bea_start bigint;
  scenario text;
  parts text[];
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

  -- One player's pick, as that player.
  create function pg_temp.pick(event uuid, who uuid, choice text) returns jsonb language plpgsql as $f$
  begin
    perform pg_temp.act_as(who);
    return public.lock_in(gen_random_uuid(), event, choice);
  end;
  $f$;

  insert into auth.users (id, email)
  select id, 'minoria-' || name || '@marcona.invalid'
  from unnest(array[anna, bea, cesc, dani, ester, ferran, gina, pobre],
    array['anna', 'bea', 'cesc', 'dani', 'ester', 'ferran', 'gina', 'pobre']) as person (id, name);
  insert into public.profiles (user_id, username)
  select id, 'minoria-' || name
  from unnest(array[anna, bea, cesc, dani, ester, ferran, gina, pobre],
    array['anna', 'bea', 'cesc', 'dani', 'ester', 'ferran', 'gina', 'pobre']) as person (id, name);
  insert into auth.users (id, email) values (tess, 'minoria-tess@marcona.invalid');
  insert into public.profiles (user_id, username, is_test) values (tess, 'minoria-tess', true);
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

  -- REQ-193: only the game's two options.
  perform pg_temp.act_as(admin_id);
  round := pg_temp.new_game(10, false, array[anna, bea, cesc], true);
  perform pg_temp.act_as(anna);
  results := results || pg_temp.verdict('REQ-193 a duel choice is not an option', pg_temp.refusal(format(
    $s$select public.lock_in(gen_random_uuid(), %L, 'confia')$s$, round
  )) = 'invalid_game_choice');
  results := results || pg_temp.verdict('REQ-193 a label is not an option', pg_temp.refusal(format(
    $s$select public.lock_in(gen_random_uuid(), %L, 'Blanc')$s$, round
  )) = 'invalid_game_choice');

  -- REQ-205: the first choice is final, and a repeat of it changes nothing.
  request := gen_random_uuid();
  outcome := public.lock_in(request, round, 'a');
  results := results || pg_temp.verdict('REQ-193 a choice is locked in',
    (outcome ->> 'saved')::boolean and not (outcome ->> 'revealed')::boolean
    and (select choice from private.choices where event_id = round and user_id = anna) = 'a');
  results := results || pg_temp.verdict('REQ-205 a locked-in choice cannot change', pg_temp.refusal(format(
    $s$select public.lock_in(gen_random_uuid(), %L, 'b')$s$, round
  )) = 'choice_locked'
    and (select choice from private.choices where event_id = round and user_id = anna) = 'a');
  results := results || pg_temp.verdict('REQ-205 nor be sent again', pg_temp.refusal(format(
    $s$select public.lock_in(gen_random_uuid(), %L, 'a')$s$, round
  )) = 'choice_locked');
  results := results || pg_temp.verdict('REQ-062 a repeated lock-in returns the first answer',
    public.lock_in(request, round, 'a') = outcome);
  perform pg_temp.act_as(admin_id);
  results := results || pg_temp.verdict('REQ-125 the admin who is not playing cannot pick', pg_temp.refusal(format(
    $s$select public.lock_in(gen_random_uuid(), %L, 'a')$s$, round
  )) = 'not_allowed');
  results := results || pg_temp.verdict('REQ-194 no public row changes before the reveal',
    (select phase from public.events where id = round) = 'choosing'
    and not exists (select 1 from public.ledger where event_id = round and kind <> 'event_buy_in'));

  -- REQ-161: 5 players with 10 each, 2 against 3. The admin plays here.
  round := pg_temp.new_game(10, true, array[anna, bea, cesc, ester], true);
  anna_start := pg_temp.balance(anna);
  bea_start := pg_temp.balance(bea);
  cesc_start := pg_temp.balance(cesc);
  admin_start := pg_temp.balance(admin_id);
  perform pg_temp.pick(round, anna, 'a');
  perform pg_temp.pick(round, admin_id, 'b');
  perform pg_temp.pick(round, bea, 'a');
  perform pg_temp.pick(round, cesc, 'b');
  outcome := pg_temp.pick(round, ester, 'b');
  results := results || pg_temp.verdict('REQ-127 the last pick reveals',
    (outcome ->> 'revealed')::boolean
    and (select status = 'completed' and phase = 'revealed' from public.events where id = round));
  results := results || pg_temp.verdict('REQ-161 the smaller side splits the pot',
    pg_temp.balance(anna) = anna_start + 25 and pg_temp.balance(bea) = bea_start + 25
    and pg_temp.balance(cesc) = cesc_start and pg_temp.balance(admin_id) = admin_start);
  results := results || pg_temp.verdict('REQ-145 only winners get a movement, from the creator',
    (select count(*) from public.ledger where event_id = round and kind = 'event_payout') = 2
    and not exists (select 1 from public.ledger where event_id = round and kind = 'event_payout' and actor_id <> admin_id)
    and not exists (select 1 from public.ledger where event_id = round and kind = 'event_refund'));
  results := results || pg_temp.verdict('REQ-132 the reveal holds every choice and payout',
    (select reveal ->> 'verdict' = 'split' and reveal ->> 'minority' = 'a' and (reveal ->> 'share')::bigint = 25
      and reveal ->> 'remainder_to' = anna::text and jsonb_array_length(reveal -> 'players') = 5
     from public.events where id = round)
    and exists (
      select 1 from jsonb_array_elements((select reveal -> 'players' from public.events where id = round)) as player
      where player ->> 'user_id' = cesc::text and player ->> 'choice' = 'b' and (player ->> 'payout')::bigint = 0));

  -- REQ-162: 7 players with 5 each, so 35 among 3 is 11 each and 2 left over.
  -- Gina picks first, on the bigger side, so the remainder goes to the first of
  -- the smaller side, not the first of all.
  perform pg_temp.act_as(admin_id);
  round :=pg_temp.new_game(5, true, array[anna, bea, cesc, ester, ferran, gina], true);
  anna_start := pg_temp.balance(anna);
  bea_start := pg_temp.balance(bea);
  cesc_start := pg_temp.balance(cesc);
  perform pg_temp.pick(round, gina, 'a');
  perform pg_temp.pick(round, bea, 'b');
  perform pg_temp.pick(round, anna, 'b');
  perform pg_temp.pick(round, admin_id, 'a');
  perform pg_temp.pick(round, ferran, 'a');
  perform pg_temp.pick(round, cesc, 'b');
  perform pg_temp.pick(round, ester, 'a');
  results := results || pg_temp.verdict('REQ-162 the first of the smaller side gets the remainder',
    pg_temp.balance(bea) = bea_start + 13 and pg_temp.balance(anna) = anna_start + 11 and pg_temp.balance(cesc) = cesc_start + 11
    and (select sum(delta) from public.ledger where event_id = round and kind = 'event_payout') = 35
    and (select reveal ->> 'remainder_to' from public.events where id = round) = bea::text);

  -- REQ-163: a tie, and a unanimous choice, give everyone their buy-in back.
  foreach scenario in array array['a,a,b,b', 'a,a,a,a', 'b,b,b,b'] loop
    parts := string_to_array(scenario, ',');
    perform pg_temp.act_as(admin_id);
    round := pg_temp.new_game(10, false, array[anna, bea, cesc, ester], true);
    anna_start := pg_temp.balance(anna);
    cesc_start := pg_temp.balance(cesc);
    perform pg_temp.pick(round, anna, parts[1]);
    perform pg_temp.pick(round, bea, parts[2]);
    perform pg_temp.pick(round, cesc, parts[3]);
    outcome := pg_temp.pick(round, ester, parts[4]);
    results := results || pg_temp.verdict('REQ-163 everyone is refunded on ' || scenario,
      (outcome ->> 'revealed')::boolean
      and pg_temp.balance(anna) = anna_start + 10 and pg_temp.balance(cesc) = cesc_start + 10
      and (select count(*) from public.ledger where event_id = round and kind = 'event_refund' and delta = 10 and actor_id = admin_id) = 4
      and not exists (select 1 from public.ledger where event_id = round and kind = 'event_payout')
      and (select reveal ->> 'verdict' from public.events where id = round) = case when scenario = 'a,a,b,b' then 'tie' else 'unanimous' end
      and (select status from public.events where id = round) = 'completed');
  end loop;

  -- REQ-204: a pick after the reveal changes nothing, and asks for the reveal.
  perform pg_temp.act_as(anna);
  outcome := public.lock_in(gen_random_uuid(), round, 'a');
  results := results || pg_temp.verdict('REQ-204 a late pick changes nothing',
    not (outcome ->> 'saved')::boolean and (outcome ->> 'revealed')::boolean);

  -- REQ-135: a stuck game is cancelled and everyone is refunded.
  perform pg_temp.act_as(admin_id);
  round := pg_temp.new_game(10, false, array[anna, bea, cesc], true);
  anna_start := pg_temp.balance(anna);
  perform pg_temp.pick(round, anna, 'a');
  perform pg_temp.act_as(admin_id);
  perform public.cancel_event(gen_random_uuid(), round);
  results := results || pg_temp.verdict('REQ-135 cancelling La minoria refunds everyone',
    pg_temp.balance(anna) = anna_start + 10
    and (select count(*) from public.ledger where event_id = round and kind = 'event_refund') = 3
    and (select reveal from public.events where id = round) is null);

  -- REQ-197: everyone sees who has locked in, and nobody sees a choice.
  perform pg_temp.act_as(admin_id);
  round := pg_temp.new_game(10, false, array[anna, bea, cesc], true);
  perform pg_temp.act_as(bea);
  results := results || pg_temp.verdict('REQ-197 nobody has locked in yet',
    public.game_state(round) -> 'locked_in' = '[]'::jsonb);
  perform pg_temp.pick(round, anna, 'b');
  perform pg_temp.act_as(bea);
  outcome := public.game_state(round);
  results := results || pg_temp.verdict('REQ-197 a player sees who has locked in',
    outcome -> 'locked_in' = jsonb_build_array(anna));
  results := results || pg_temp.verdict('REQ-128 the state holds no choice',
    outcome -> 'reveal' = 'null'::jsonb and outcome::text not like '%"choice"%');
  perform pg_temp.act_as(anna);
  results := results || pg_temp.verdict('REQ-197 the one who locked in reads the same', public.game_state(round) = outcome);
  perform pg_temp.act_as(admin_id);
  results := results || pg_temp.verdict('REQ-197 the admin reads the same', public.game_state(round) = outcome);

  -- A player can read their own choice, and nobody else's.
  perform pg_temp.act_as(anna);
  results := results || pg_temp.verdict('A player reads their own choice', public.my_choice(round) = '{"choice": "b"}'::jsonb);
  perform pg_temp.act_as(bea);
  results := results || pg_temp.verdict('A player who has not picked reads nothing',
    public.my_choice(round) = '{"choice": null}'::jsonb);
  perform pg_temp.act_as(admin_id);
  results := results || pg_temp.verdict('REQ-128 the admin who is not playing reads nothing',
    public.my_choice(round) = '{"choice": null}'::jsonb);
  perform pg_temp.act_as(tess);
  results := results || pg_temp.verdict('A test account cannot read a real game', pg_temp.refusal(format(
    $s$select public.my_choice(%L)$s$, round
  )) = 'event_not_found' and pg_temp.refusal(format(
    $s$select public.game_state(%L)$s$, round
  )) = 'event_not_found');

  -- REQ-194: a duel says nothing about who has picked, not even to the picker.
  perform pg_temp.act_as(admin_id);
  round := (public.create_game_event(gen_random_uuid(), 'confia_o_traeix', 'Prova', 10, false, array[anna, bea], true) ->> 'event_id')::uuid;
  perform pg_temp.pick(round, anna, 'confia');
  results := results || pg_temp.verdict('REQ-194 a duel shows no lock-ins', not (public.game_state(round) ? 'locked_in'));
  results := results || pg_temp.verdict('REQ-194 a duel choice cannot be read back', pg_temp.refusal(format(
    $s$select public.my_choice(%L)$s$, round
  )) = 'not_allowed');

  raise exception 'RESULTS %', results;
end;
$$;
