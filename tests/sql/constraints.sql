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

  raise exception 'RESULTS %', results;
end;
$$;
