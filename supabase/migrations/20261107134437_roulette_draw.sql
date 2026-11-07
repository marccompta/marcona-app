-- Settings the admin can change. Nothing reaches this table from the browser:
-- public functions read and write it, so it has no policies.
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
revoke all on table public.app_settings from public, anon, authenticated, service_role;

-- REQ-104: white is "1 in N", and red and black share the rest evenly.
insert into public.app_settings (key, value)
values ('roulette', '{"enabled": true, "white_one_in": 37, "max_bet_percent": 5}');

-- REQ-103: a whole number from 0 up to p_limit, from a secure source. Values past
-- the last full multiple of p_limit are drawn again, so no result is favoured.
create function private.random_below(p_limit bigint)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  span constant bigint := 4294967296;
  usable bigint := span - span % p_limit;
  bytes bytea;
  drawn bigint;
begin
  loop
    bytes := extensions.gen_random_bytes(4);
    drawn := (get_byte(bytes, 0)::bigint << 24)
      | (get_byte(bytes, 1)::bigint << 16)
      | (get_byte(bytes, 2)::bigint << 8)
      | get_byte(bytes, 3)::bigint;

    if drawn < usable then
      return drawn % p_limit;
    end if;
  end loop;
end;
$$;

-- REQ-104: of 2N slots, 2 are white, and red and black get N - 1 each. With N of
-- 37, that's exactly 18, 18 and 1 in 37.
create function private.roulette_colour(p_slot bigint, p_white_one_in integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_slot < 2 then 'white'
    when p_slot <= p_white_one_in then 'red'
    else 'black'
  end;
$$;

create function private.draw_roulette(p_white_one_in integer)
returns text
language sql
set search_path = ''
as $$
  select private.roulette_colour(private.random_below(2 * p_white_one_in), p_white_one_in);
$$;

revoke all on function private.random_below(bigint), private.roulette_colour(bigint, integer), private.draw_roulette(integer)
  from public, anon, authenticated, service_role;
