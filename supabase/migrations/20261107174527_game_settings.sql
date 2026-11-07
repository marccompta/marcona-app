-- REQ-144: the rule for a duel's numbers, which a new duel copies. Whole numbers
-- from 0 to 1000, in the order that keeps the game worth playing. It returns only
-- the four numbers, so nothing else can reach the settings.
create function private.valid_duel_settings(p_settings jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  field text;
  value jsonb;
begin
  foreach field in array array['both_trust', 'betrayer', 'betrayed', 'both_betray'] loop
    value := p_settings -> field;
    if value is null or jsonb_typeof(value) <> 'number'
      or value::numeric < 0 or value::numeric > 1000 or value::numeric <> trunc(value::numeric) then
      raise exception 'invalid_game_percentage';
    end if;
  end loop;

  if not (
    (p_settings ->> 'betrayer')::integer > (p_settings ->> 'both_trust')::integer
    and (p_settings ->> 'both_trust')::integer > (p_settings ->> 'both_betray')::integer
    and (p_settings ->> 'both_betray')::integer >= (p_settings ->> 'betrayed')::integer
  ) then
    raise exception 'invalid_duel_order';
  end if;

  return jsonb_build_object(
    'both_trust', (p_settings ->> 'both_trust')::integer,
    'betrayer', (p_settings ->> 'betrayer')::integer,
    'betrayed', (p_settings ->> 'betrayed')::integer,
    'both_betray', (p_settings ->> 'both_betray')::integer
  );
end;
$$;

revoke all on function private.valid_duel_settings(jsonb) from public, anon, authenticated, service_role;

-- REQ-146, REQ-147: applies to new events. Running ones keep their own copy.
create function public.set_game_settings(p_game text, p_enabled boolean, p_description text, p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleaned text := btrim(p_description);
  checked jsonb;
  saved public.games;
begin
  if not (select private.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if p_enabled is null then
    raise exception 'invalid_game_options';
  end if;

  if cleaned is null or cleaned = '' then
    raise exception 'game_description_required';
  end if;

  if char_length(cleaned) > 1000 then
    raise exception 'game_description_too_long';
  end if;

  if p_game = 'confia_o_traeix' then
    checked := private.valid_duel_settings(p_settings);
  else
    raise exception 'game_not_found';
  end if;

  update public.games
  set enabled = p_enabled, description = cleaned, settings = checked, updated_at = now()
  where id = p_game
  returning * into saved;

  return to_jsonb(saved);
end;
$$;

revoke all on function public.set_game_settings(text, boolean, text, jsonb) from public, anon, service_role;
grant execute on function public.set_game_settings(text, boolean, text, jsonb) to authenticated;
