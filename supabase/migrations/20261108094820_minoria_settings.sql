-- REQ-160: the rule for La minoria's labels, which a new game copies. Two labels,
-- trimmed, of 1 to 20 characters, that differ even ignoring case. It returns only
-- the two labels, so nothing else can reach the settings.
create function private.valid_minoria_settings(p_settings jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  field text;
  label text;
  labels text[] := '{}';
begin
  foreach field in array array['option_a', 'option_b'] loop
    if jsonb_typeof(p_settings -> field) is distinct from 'string' then
      raise exception 'game_option_required';
    end if;

    label := btrim(p_settings ->> field);
    if label = '' then
      raise exception 'game_option_required';
    end if;

    if char_length(label) > 20 then
      raise exception 'game_option_too_long';
    end if;

    labels := labels || label;
  end loop;

  if lower(labels[1]) = lower(labels[2]) then
    raise exception 'game_options_same';
  end if;

  return jsonb_build_object('option_a', labels[1], 'option_b', labels[2]);
end;
$$;

revoke all on function private.valid_minoria_settings(jsonb) from public, anon, authenticated, service_role;

-- REQ-146, REQ-147, REQ-160: applies to new events. Running ones keep their own copy.
-- As in slice 005, with a branch for La minoria.
create or replace function public.set_game_settings(p_game text, p_enabled boolean, p_description text, p_settings jsonb)
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
  elsif p_game = 'la_minoria' then
    checked := private.valid_minoria_settings(p_settings);
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

-- The seed left La minoria off until its screens existed. This is the slice's last
-- migration, so it turns it on. From here the admin turns it on and off.
update public.games set enabled = true, updated_at = now() where id = 'la_minoria';
