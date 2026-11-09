-- The export, the wipe and its lock, which need the real admin and must never
-- touch the real data. Run this through the Supabase MCP server's execute_sql,
-- as the database owner.
--
-- It always ends by raising an exception, which rolls everything back and
-- carries the results in its message. Every entry should say "passed".
do $$
declare
  results jsonb := '{}';
  admin_id uuid := (select user_id from public.profiles where role = 'admin');
  anna uuid := gen_random_uuid();
  bea uuid := gen_random_uuid();
  tess uuid := gen_random_uuid();
  duel uuid;
  dump jsonb;
  exported_duel jsonb;
  before jsonb;
  outcome jsonb;
  started timestamptz;
  kept_settings jsonb;
  kept_games jsonb;
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

  -- Every row the wipe could touch, counted.
  create function pg_temp.counts() returns jsonb language sql as $f$
    select jsonb_build_object(
      'auth_users', (select count(*) from auth.users),
      'profiles', (select count(*) from public.profiles),
      'ledger', (select count(*) from public.ledger),
      'events', (select count(*) from public.events),
      'participants', (select count(*) from public.event_participants),
      'choices', (select count(*) from private.choices),
      'requests', (select count(*) from private.money_requests),
      'balances', (select sum(balance) from public.profiles)
    );
  $f$;

  create function pg_temp.act_as(who uuid) returns void language sql as $f$
    select set_config('request.jwt.claims', jsonb_build_object('sub', who, 'role', 'authenticated')::text, true);
  $f$;

  insert into auth.users (id, email)
  values (anna, 'readiness-anna@marcona.invalid'), (bea, 'readiness-bea@marcona.invalid'),
    (tess, 'readiness-tess@marcona.invalid');
  insert into public.profiles (user_id, username, is_test)
  values (anna, 'readiness-anna', false), (bea, 'readiness-bea', false), (tess, 'readiness-tess', true);
  perform private.apply_movement(admin_id, 100, 'admin_adjustment', 'Prova');
  perform private.apply_movement(anna, 50, 'admin_adjustment', 'Prova');
  perform private.apply_movement(bea, 50, 'admin_adjustment', 'Prova');
  perform private.apply_movement(tess, 30, 'admin_adjustment', 'Prova');

  -- A forced duel with one secret choice in it, not yet revealed.
  perform pg_temp.act_as(admin_id);
  duel := (public.create_game_event(gen_random_uuid(), 'confia_o_traeix', 'Prova', 5, false, array[anna, bea], true) ->> 'event_id')::uuid;
  perform pg_temp.act_as(anna);
  perform public.lock_in(gen_random_uuid(), duel, 'traeix');

  -- REQ-167: only the admin exports.
  results := results || pg_temp.verdict('REQ-167 a player cannot export',
    pg_temp.refusal('select public.admin_export()') = 'not_allowed');

  -- REQ-164: everything, including test accounts and removed users.
  perform pg_temp.act_as(admin_id);
  dump := public.admin_export();
  results := results || pg_temp.verdict('REQ-164 the export has every user',
    jsonb_array_length(dump -> 'users') = (select count(*) from public.profiles)
    and dump -> 'users' @> jsonb_build_array(jsonb_build_object('username', 'readiness-bea', 'balance', 45),
      jsonb_build_object('username', 'readiness-tess', 'is_test', true, 'balance', 30)));
  results := results || pg_temp.verdict('REQ-164 the export has every event, with its people',
    jsonb_array_length(dump -> 'events') = (select count(*) from public.events)
    and (select sum(jsonb_array_length(event -> 'participants')) from jsonb_array_elements(dump -> 'events') as event)
      = (select count(*) from public.event_participants));
  results := results || pg_temp.verdict('REQ-164 the export has every movement',
    jsonb_array_length(dump -> 'ledger') = (select count(*) from public.ledger)
    and dump -> 'ledger' @> jsonb_build_array(jsonb_build_object('user_id', anna, 'delta', 50, 'concept', 'Prova')));

  -- REQ-164: an unrevealed choice appears nowhere, under any name.
  select event into exported_duel from jsonb_array_elements(dump -> 'events') as event where event ->> 'id' = duel::text;
  results := results || pg_temp.verdict('REQ-164 unrevealed choices are not in the export',
    exported_duel -> 'reveal' = 'null'::jsonb
    and exported_duel::text not like '%"traeix"%'
    and not dump ? 'choices'
    and (select array_agg(key order by key) from jsonb_object_keys(dump) as key) = array['events', 'exported_at', 'ledger', 'users']);

  -- REQ-167, REQ-168: only the admin reads or sets the lock, and it starts open.
  perform pg_temp.act_as(anna);
  results := results || pg_temp.verdict('REQ-167 a player cannot lock the wipe or read the lock',
    pg_temp.refusal('select public.lock_wipe()') = 'not_allowed'
    and pg_temp.refusal('select public.wipe_state()') = 'not_allowed');
  perform pg_temp.act_as(admin_id);
  results := results || pg_temp.verdict('REQ-168 the wipe starts unlocked',
    public.wipe_state() = '{"locked": false}'::jsonb);

  -- REQ-167: only the admin wipes.
  perform pg_temp.act_as(anna);
  before := pg_temp.counts();
  results := results || pg_temp.verdict('REQ-167 a player cannot wipe',
    pg_temp.refusal($s$select public.admin_wipe('ESBORRA')$s$) = 'not_allowed' and pg_temp.counts() = before);

  -- REQ-166: anything but the exact word changes nothing.
  perform pg_temp.act_as(admin_id);
  results := results || pg_temp.verdict('REQ-166 a wipe without the exact word changes nothing',
    pg_temp.refusal($s$select public.admin_wipe('esborra')$s$) = 'wipe_not_confirmed'
    and pg_temp.refusal($s$select public.admin_wipe('ESBORRA ')$s$) = 'wipe_not_confirmed'
    and pg_temp.refusal($s$select public.admin_wipe('')$s$) = 'wipe_not_confirmed'
    and pg_temp.refusal($s$select public.admin_wipe(null)$s$) = 'wipe_not_confirmed'
    and pg_temp.counts() = before);

  -- REQ-165: only the admin account and the settings remain, at 0 marcones.
  -- Hosted tests may be running, so hold what the wipe holds before counting.
  lock table auth.users, public.profiles, public.events, public.event_participants, public.ledger,
    private.choices, private.money_requests in exclusive mode;
  before := pg_temp.counts();
  kept_settings := (select jsonb_agg(to_jsonb(setting) order by key) from public.app_settings as setting);
  kept_games := (select jsonb_agg(to_jsonb(game) order by id) from public.games as game);
  started := clock_timestamp();
  outcome := public.admin_wipe('ESBORRA');
  results := results || jsonb_build_object('wipe ms', round(extract(epoch from clock_timestamp() - started) * 1000));
  results := results || pg_temp.verdict('REQ-165 only the admin remains, with 0 marcones and no history',
    pg_temp.counts() = '{"auth_users": 1, "profiles": 1, "ledger": 0, "events": 0, "participants": 0, "choices": 0, "requests": 0, "balances": 0}'::jsonb
    and (select user_id from public.profiles) = admin_id
    and (select id from auth.users) = admin_id);
  results := results || pg_temp.verdict('REQ-165 it reports what it deleted',
    outcome = jsonb_build_object('users', (before ->> 'auth_users')::int - 1, 'events', (before ->> 'events')::int,
      'movements', (before ->> 'ledger')::int));
  results := results || pg_temp.verdict('REQ-165 the settings and games stay as they were',
    (select jsonb_agg(to_jsonb(setting) order by key) from public.app_settings as setting) = kept_settings
    and (select jsonb_agg(to_jsonb(game) order by id) from public.games as game) = kept_games);

  -- REQ-165: old usernames can be used again.
  results := results || pg_temp.verdict('REQ-165 an old username can be used again', pg_temp.refusal($s$
    with person as (
      insert into auth.users (id, email) values (gen_random_uuid(), 'readiness-anna@marcona.invalid') returning id
    )
    insert into public.profiles (user_id, username) select id, 'readiness-anna' from person
  $s$) = 'ACCEPTED');

  -- REQ-059, REQ-165: the ledger is append-only again as soon as the wipe returns.
  -- Truncating is covered by constraints.sql.
  perform private.apply_movement(admin_id, 5, 'admin_adjustment', 'Prova');
  results := results || pg_temp.verdict('REQ-165 only the wipe deletes movements',
    pg_temp.refusal('delete from public.ledger where true') = 'ledger_is_append_only'
    and coalesce(current_setting('marcona.wiping', true), '') <> 'on'
    and (select count(*) from public.ledger) = 1);

  -- REQ-168: once locked, every wipe is refused, even with the word, and nothing
  -- unlocks it.
  perform pg_temp.act_as(admin_id);
  -- Separate statements, as wipe_state() is stable and would otherwise see the
  -- snapshot from before the lock.
  outcome := public.lock_wipe();
  outcome := outcome || public.lock_wipe();
  results := results || pg_temp.verdict('REQ-168 the admin locks the wipe, and locking again changes nothing',
    outcome = '{"locked": true}'::jsonb and public.wipe_state() = '{"locked": true}'::jsonb);
  before := pg_temp.counts();
  results := results || pg_temp.verdict('REQ-168 a locked wipe is refused and changes nothing',
    pg_temp.refusal($s$select public.admin_wipe('ESBORRA')$s$) = 'wipe_locked'
    and pg_temp.refusal($s$select public.admin_wipe('esborra')$s$) = 'wipe_locked'
    and pg_temp.counts() = before);

  raise exception 'RESULTS %', results;
end;
$$;
