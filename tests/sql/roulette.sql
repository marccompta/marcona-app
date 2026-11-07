-- Roulette rules that the hosted tests can't reach. Run this through the
-- Supabase MCP server's execute_sql, as the database owner.
--
-- It always ends by raising an exception, which rolls everything back and
-- carries the results in its message. Every entry should say "passed".
do $$
declare
  results jsonb := '{}';
  draws constant integer := 370000;
  drawn text;
  red integer := 0;
  black integer := 0;
  white integer := 0;
  n integer;
  slot integer;
  failures text := '';
  source text;
  anna uuid := gen_random_uuid();
  outcome jsonb;
  spins constant integer := 400;
begin
  -- REQ-104: every "1 in N" splits its slots exactly: 2 white, the rest even.
  for n in 2..1000 loop
    red := 0;
    black := 0;
    white := 0;
    for slot in 0..(2 * n - 1) loop
      drawn := private.roulette_colour(slot, n);
      if drawn = 'red' then red := red + 1;
      elsif drawn = 'black' then black := black + 1;
      elsif drawn = 'white' then white := white + 1;
      end if;
    end loop;
    if white <> 2 or red <> n - 1 or black <> n - 1 then
      failures := failures || format('1 in %s: %s/%s/%s; ', n, red, black, white);
    end if;
  end loop;

  results := results || jsonb_build_object(
    'REQ-104 slots split exactly', case when failures = '' then 'passed' else 'FAILED: ' || left(failures, 300) end
  );

  -- REQ-103, REQ-104: the default odds, on a sample. The limits are about five
  -- standard deviations wide, so a pass doesn't depend on luck.
  red := 0;
  black := 0;
  white := 0;
  for slot in 1..draws loop
    drawn := private.draw_roulette(37);
    if drawn = 'red' then red := red + 1;
    elsif drawn = 'black' then black := black + 1;
    elsif drawn = 'white' then white := white + 1;
    end if;
  end loop;

  results := results || jsonb_build_object(
    'REQ-104 sample', format('%s red, %s black, %s white of %s', red, black, white, draws),
    'REQ-104 near 18, 18 and 1 in 37',
    case when red between 178500 and 181500 and black between 178500 and 181500 and white between 9500 and 10500
    then 'passed' else 'FAILED' end
  );

  -- REQ-104: the stored defaults.
  results := results || jsonb_build_object(
    'REQ-104 default settings',
    case when (select value from public.app_settings where key = 'roulette')
      = '{"enabled": true, "white_one_in": 37, "max_bet_percent": 5}'::jsonb
    then 'passed' else 'FAILED' end
  );

  -- REQ-103: the draw reads a secure source, and never Postgres's random().
  select prosrc into source
  from pg_proc
  where oid = 'private.random_below(bigint)'::regprocedure;

  results := results || jsonb_build_object(
    'REQ-103 secure source',
    case when source like '%extensions.gen_random_bytes%' and source not like '%random()%'
    then 'passed' else 'FAILED' end
  );

  -- REQ-105, REQ-106: hosted tests can't make white come up, so this lowers the
  -- odds for this transaction only, and spins as a throwaway player.
  insert into auth.users (id, email) values (anna, 'roulette-check@marcona.invalid');
  insert into public.profiles (user_id, username, is_test) values (anna, 'roulette-check', true);
  perform private.apply_movement(anna, 100000, 'admin_adjustment');
  update public.app_settings set value = value || '{"white_one_in": 2}' where key = 'roulette';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', anna, 'role', 'authenticated')::text, true);

  red := 0;
  black := 0;
  white := 0;
  failures := '';
  for slot in 1..spins loop
    outcome := public.spin(gen_random_uuid(), 'red', 5);
    drawn := outcome ->> 'result';
    if drawn = 'red' then red := red + 1;
    elsif drawn = 'black' then black := black + 1;
    elsif drawn = 'white' then white := white + 1;
    end if;
    if (outcome ->> 'delta')::integer <> (case when drawn = 'red' then 5 else -5 end)
      or (outcome ->> 'won')::boolean <> (drawn = 'red') then
      failures := failures || outcome::text || '; ';
    end if;
  end loop;

  results := results || jsonb_build_object(
    'REQ-105, REQ-106 sample', format('%s red, %s black, %s white of %s', red, black, white, spins),
    'REQ-105 red wins, REQ-106 black and white lose',
    case when failures = '' and red > 0 and black > 0 and white > 0 then 'passed' else 'FAILED: ' || left(failures, 300) end
  );

  raise exception 'RESULTS %', results;
end;
$$;
