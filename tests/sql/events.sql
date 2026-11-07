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

  raise exception 'RESULTS %', results;
end;
$$;
