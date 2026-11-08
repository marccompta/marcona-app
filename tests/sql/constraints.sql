-- Rules that only show up for a role able to get past the grants. Run this
-- through the Supabase MCP server's execute_sql, as the database owner.
--
-- It always ends by raising an exception, which rolls everything back and
-- carries the results in its message. Every entry should say "rejected".
do $$
declare
  anna uuid := gen_random_uuid();
  movement_id bigint;
  event_id uuid;
  results jsonb := '{}';
begin
  insert into auth.users (id, email) values (anna, 'constraint-check@marcona.invalid');
  insert into public.profiles (user_id, username, is_test) values (anna, 'constraint-check', true);

  -- REQ-056: a second admin.
  begin
    update public.profiles set role = 'admin' where user_id = anna;
    results := results || '{"REQ-056 second admin": "ACCEPTED"}';
  exception when unique_violation then
    results := results || '{"REQ-056 second admin": "rejected"}';
  end;

  -- REQ-061: a negative balance stored directly.
  begin
    update public.profiles set balance = -1 where user_id = anna;
    results := results || '{"REQ-061 negative balance": "ACCEPTED"}';
  exception when check_violation then
    results := results || '{"REQ-061 negative balance": "rejected"}';
  end;

  -- REQ-061: a movement that would go below 0.
  begin
    perform private.apply_movement(anna, -1, 'admin_adjustment');
    results := results || '{"REQ-061 movement below 0": "ACCEPTED"}';
  exception when raise_exception then
    results := results || '{"REQ-061 movement below 0": "rejected"}';
  end;

  -- REQ-061: a ledger row with a negative balance after it.
  begin
    insert into public.ledger (user_id, delta, balance_after, kind) values (anna, -1, -1, 'admin_adjustment');
    results := results || '{"REQ-061 negative balance_after": "ACCEPTED"}';
  exception when check_violation then
    results := results || '{"REQ-061 negative balance_after": "rejected"}';
  end;

  select id into movement_id from private.apply_movement(anna, 5, 'admin_adjustment');

  -- REQ-059: changing a ledger row as the owner.
  begin
    update public.ledger set delta = 500 where id = movement_id;
    results := results || '{"REQ-059 update as owner": "ACCEPTED"}';
  exception when raise_exception then
    results := results || '{"REQ-059 update as owner": "rejected"}';
  end;

  begin
    delete from public.ledger where id = movement_id;
    results := results || '{"REQ-059 delete as owner": "ACCEPTED"}';
  exception when raise_exception then
    results := results || '{"REQ-059 delete as owner": "rejected"}';
  end;

  begin
    truncate public.ledger;
    results := results || '{"REQ-059 truncate as owner": "ACCEPTED"}';
  exception when raise_exception then
    results := results || '{"REQ-059 truncate as owner": "rejected"}';
  end;

  -- REQ-074: percentages that don't sum to 100, stored directly.
  begin
    insert into public.events (name, buy_in, creator_id, payout_first, payout_second, payout_third)
    values ('Prova', 1, anna, 50, 30, 10);
    results := results || '{"REQ-074 percentages not 100": "ACCEPTED"}';
  exception when check_violation then
    results := results || '{"REQ-074 percentages not 100": "rejected"}';
  end;

  -- REQ-075: a buy-in of 0, stored directly.
  begin
    insert into public.events (name, buy_in, creator_id, payout_first, payout_second, payout_third)
    values ('Prova', 0, anna, 50, 30, 20);
    results := results || '{"REQ-075 buy-in of 0": "ACCEPTED"}';
  exception when check_violation then
    results := results || '{"REQ-075 buy-in of 0": "rejected"}';
  end;

  -- REQ-083: a fourth state, and changing a finished event as the owner.
  insert into public.events (name, buy_in, creator_id, payout_first, payout_second, payout_third)
  values ('Prova', 1, anna, 50, 30, 20)
  returning id into event_id;

  begin
    update public.events set status = 'paused' where id = event_id;
    results := results || '{"REQ-083 unknown state": "ACCEPTED"}';
  exception when check_violation then
    results := results || '{"REQ-083 unknown state": "rejected"}';
  end;

  update public.events set status = 'completed' where id = event_id;

  begin
    update public.events set status = 'open' where id = event_id;
    results := results || '{"REQ-083 reopen as owner": "ACCEPTED"}';
  exception when raise_exception then
    results := results || '{"REQ-083 reopen as owner": "rejected"}';
  end;

  begin
    update public.events set name = 'Una altra' where id = event_id;
    results := results || '{"REQ-083 rename as owner": "ACCEPTED"}';
  exception when raise_exception then
    results := results || '{"REQ-083 rename as owner": "rejected"}';
  end;

  -- REQ-099: a movement pointing at an event that doesn't exist.
  begin
    perform private.apply_movement(anna, 1, 'event_payout', null, gen_random_uuid());
    results := results || '{"REQ-099 movement with unknown event": "ACCEPTED"}';
  exception when foreign_key_violation then
    results := results || '{"REQ-099 movement with unknown event": "rejected"}';
  end;

  -- REQ-122: a game stored directly with no settings, or a classic event with a game.
  begin
    insert into public.events (type, name, buy_in, creator_id, game, phase)
    values ('game', 'Prova', 1, anna, 'confia_o_traeix', 'choosing');
    results := results || '{"REQ-122 game without settings": "ACCEPTED"}';
  exception when check_violation then
    results := results || '{"REQ-122 game without settings": "rejected"}';
  end;

  begin
    insert into public.events (name, buy_in, creator_id, payout_first, payout_second, payout_third, game)
    values ('Prova', 1, anna, 50, 30, 20, 'confia_o_traeix');
    results := results || '{"REQ-122 classic event with a game": "ACCEPTED"}';
  exception when check_violation then
    results := results || '{"REQ-122 classic event with a game": "rejected"}';
  end;

  begin
    insert into public.events (name, buy_in, creator_id)
    values ('Prova', 1, anna);
    results := results || '{"REQ-074 classic event without payouts": "ACCEPTED"}';
  exception when check_violation then
    results := results || '{"REQ-074 classic event without payouts": "rejected"}';
  end;

  -- REQ-127: a phase that doesn't exist, and a reveal changed once it's finished.
  begin
    insert into public.events (type, name, buy_in, creator_id, game, settings, phase)
    values ('game', 'Prova', 1, anna, 'confia_o_traeix', '{}', 'paused');
    results := results || '{"REQ-127 unknown phase": "ACCEPTED"}';
  exception when check_violation then
    results := results || '{"REQ-127 unknown phase": "rejected"}';
  end;

  insert into public.events (type, name, buy_in, creator_id, game, settings, phase, status, reveal)
  values ('game', 'Prova', 1, anna, 'confia_o_traeix', '{}', 'revealed', 'completed', '{"players": []}')
  returning id into event_id;

  begin
    update public.events set reveal = '{"players": [1]}' where id = event_id;
    results := results || '{"REQ-127 rewrite a reveal as owner": "ACCEPTED"}';
  exception when raise_exception then
    results := results || '{"REQ-127 rewrite a reveal as owner": "rejected"}';
  end;

  -- REQ-128, REQ-150 to REQ-152: Realtime publishes exactly these four tables,
  -- and never private.choices.
  if (select array_agg(schemaname || '.' || tablename order by schemaname, tablename)
      from pg_publication_tables where pubname = 'supabase_realtime')
    = array['public.event_participants', 'public.events', 'public.ledger', 'public.profiles']::text[] then
    results := results || '{"REQ-128 anything else published": "rejected"}';
  else
    results := results || '{"REQ-128 anything else published": "ACCEPTED"}';
  end if;

  raise exception 'RESULTS %', results;
end;
$$;
