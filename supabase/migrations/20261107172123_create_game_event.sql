-- REQ-123, REQ-176, REQ-178 to REQ-182, REQ-191: only the admin creates a game,
-- playing or not. The players' rows come before the claim, as in spin(): claiming
-- takes a shared lock on the admin's row, so two creations that both claimed first
-- would deadlock here.
create function public.create_game_event(
  p_request_id uuid,
  p_game text,
  p_name text,
  p_buy_in numeric,
  p_plays boolean,
  p_invitees uuid[],
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  event_name text := btrim(p_name);
  named uuid[] := array_remove(coalesce(p_invitees, '{}'), null);
  invitees uuid[];
  chosen public.games;
  created_id uuid;
  short text;
  player record;
  outcome jsonb;
begin
  if not (select private.is_active()) or not (select private.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if event_name is null or event_name = '' then
    raise exception 'event_name_required';
  end if;

  if char_length(event_name) > 40 then
    raise exception 'event_name_too_long';
  end if;

  if p_buy_in is null or p_buy_in < 1 or p_buy_in > 1000000000 or p_buy_in <> trunc(p_buy_in) then
    raise exception 'invalid_buy_in';
  end if;

  if p_plays is null or p_force is null then
    raise exception 'invalid_game_options';
  end if;

  select coalesce(array_agg(distinct invitee), '{}') into invitees from unnest(named) as invitee;

  perform 1
  from public.profiles
  where user_id = actor or user_id = any (invitees)
  order by user_id
  for update;

  outcome := private.claim_request(actor, p_request_id, 'create_game_event');
  if outcome is not null then
    return outcome;
  end if;

  select * into chosen from public.games where id = p_game;

  if not found then
    raise exception 'game_not_found';
  end if;

  -- REQ-121
  if not chosen.enabled then
    raise exception 'game_off';
  end if;

  -- REQ-182: slice 007 adds its own count here.
  if cardinality(named) <> cardinality(invitees)
    or cardinality(invitees) + (case when p_plays then 1 else 0 end) <> 2 then
    raise exception 'duel_needs_two_players';
  end if;

  if actor = any (invitees) or cardinality(invitees) <> (
    select count(*)
    from public.profiles
    where user_id = any (invitees)
      and removed_at is null
      and is_test = (select private.is_test_account())
  ) then
    raise exception 'invalid_invitee';
  end if;

  -- REQ-189
  if p_force then
    select string_agg(username, ', ' order by username) into short
    from public.profiles
    where user_id = any (invitees) and balance < p_buy_in;

    if short is not null then
      raise exception 'forced_insufficient_balance' using detail = short;
    end if;
  end if;

  -- REQ-122: the description is copied too, so an edit leaves running games alone.
  insert into public.events (type, game, settings, phase, creator_plays, name, buy_in, creator_id)
  values (
    'game',
    chosen.id,
    chosen.settings || jsonb_build_object('description', chosen.description),
    case when p_force then 'choosing' else 'inviting' end,
    p_plays,
    event_name,
    p_buy_in::bigint,
    actor
  )
  returning id into created_id;

  -- REQ-181: an admin who isn't playing has no row here.
  if p_plays then
    insert into public.event_participants (event_id, user_id, status)
    values (created_id, actor, 'accepted');
  end if;

  insert into public.event_participants (event_id, user_id, status)
  select created_id, invitee, case when p_force then 'accepted' else 'invited' end
  from unnest(invitees) as invitee;

  -- REQ-179, REQ-180, REQ-191: a short admin stops the event here.
  for player in
    select user_id
    from public.event_participants
    where event_id = created_id and status = 'accepted'
    order by user_id
  loop
    perform private.apply_movement(player.user_id, -p_buy_in::bigint, 'event_buy_in', null, created_id, actor);
  end loop;

  return private.finish_request(actor, p_request_id, jsonb_build_object('event_id', created_id));
end;
$$;

revoke all on function public.create_game_event(uuid, text, text, numeric, boolean, uuid[], boolean) from public, anon, service_role;
grant execute on function public.create_game_event(uuid, text, text, numeric, boolean, uuid[], boolean) to authenticated;
