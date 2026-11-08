-- REQ-155, REQ-185, REQ-192, REQ-193: La minoria, the group game. Each option has a
-- fixed key, a or b, and the labels the players see are settings, so the admin can
-- rename them (REQ-160) without touching a stored choice.
--
-- It starts turned off, because the live site on main has no screens for it yet.
-- The slice's last migration turns it on.
insert into public.games (id, enabled, description, settings)
values (
  'la_minoria',
  false,
  'Tothom tria en secret entre dues opcions. Quan tothom ha triat, el bàndol més petit es reparteix tot el pot a parts iguals. Si hi ha empat, o tothom tria el mateix, es retorna l''entrada a tothom.',
  '{"option_a": "Blanc", "option_b": "Negre"}'
);

-- REQ-155, REQ-185: at least 3 players, counting the admin only if they play.
-- Creation is refused when too few are invited to ever reach 3, so a game can't
-- be stuck from the start. Everything else is as in slice 005.
create or replace function public.create_game_event(
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
  players integer;
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
  players := cardinality(invitees) + (case when p_plays then 1 else 0 end);

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

  if chosen.id = 'la_minoria' then
    -- REQ-155, REQ-185
    if players < 3 then
      raise exception 'minoria_needs_three_players';
    end if;

    if cardinality(named) <> cardinality(invitees) then
      raise exception 'invalid_invitee';
    end if;
  -- REQ-182
  elsif cardinality(named) <> cardinality(invitees) or players <> 2 then
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
  -- REQ-191, REQ-192: a forced game has nobody left to wait for.
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

  -- REQ-179, REQ-180, REQ-191, REQ-192: a short admin stops the event here.
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

-- In La minoria a decline is only a decline, and the last answer starts nothing:
-- the creator starts it (REQ-156). A duel still cancels on a decline (REQ-183) and
-- starts once both have paid.
create or replace function public.answer_invitation(p_request_id uuid, p_event_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.events;
  outcome jsonb;
begin
  if not (select private.is_active()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select * into target from public.events where id = p_event_id for update;

  if not found then
    raise exception 'event_not_found';
  end if;

  outcome := private.claim_request(actor, p_request_id, 'answer_invitation');
  if outcome is not null then
    return outcome;
  end if;

  if target.status <> 'open' then
    raise exception 'event_not_open';
  end if;

  if not exists (
    select 1
    from public.event_participants
    where event_id = p_event_id and user_id = actor and status = 'invited'
  ) then
    raise exception 'invitation_not_pending';
  end if;

  if p_accept then
    perform private.apply_movement(actor, -target.buy_in, 'event_buy_in', null, p_event_id, actor);
  end if;

  update public.event_participants
  set status = case when p_accept then 'accepted' else 'declined' end
  where event_id = p_event_id and user_id = actor and status = 'invited';

  if not found then
    raise exception 'invitation_not_pending';
  end if;

  if target.game = 'confia_o_traeix' then
    if not coalesce(p_accept, false) then
      -- REQ-183
      perform private.cancel_open_event(target, actor);
    elsif not exists (
      select 1 from public.event_participants where event_id = p_event_id and status = 'invited'
    ) then
      update public.events set phase = 'choosing' where id = p_event_id;
    end if;
  end if;

  return private.finish_request(
    actor,
    p_request_id,
    jsonb_build_object('event_id', p_event_id, 'accepted', coalesce(p_accept, false))
  );
end;
$$;

-- REQ-184: removing someone invited to a duel still cancels it. In La minoria the
-- removal is only a decline, as an answer would be. Otherwise as in slice 005.
create or replace function public.remove_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed timestamptz;
  duels uuid[];
  duel_id uuid;
  duel public.events;
begin
  perform 1
  from public.events as event
  join public.event_participants as participant on participant.event_id = event.id
  where participant.user_id = p_user_id
    and participant.status = 'invited'
    and event.status = 'open'
    and event.game = 'confia_o_traeix'
  order by event.id
  for update of event;

  perform 1
  from public.profiles
  where user_id = p_user_id or user_id in (
    select other.user_id
    from public.event_participants as mine
    join public.events as event on event.id = mine.event_id
    join public.event_participants as other on other.event_id = event.id
    where mine.user_id = p_user_id
      and mine.status = 'invited'
      and event.status = 'open'
      and event.game = 'confia_o_traeix'
      and other.status = 'accepted'
  )
  order by user_id
  for update;

  select removed_at into removed
  from public.profiles
  where user_id = p_user_id;

  if not found then
    raise exception 'user_not_found';
  end if;

  if removed is not null then
    return;
  end if;

  if exists (
    select 1
    from public.event_participants as participant
    join public.events as event on event.id = participant.event_id
    where participant.user_id = p_user_id and participant.status = 'accepted' and event.status = 'open'
  ) then
    raise exception 'user_in_open_event';
  end if;

  select array_agg(event.id order by event.id) into duels
  from public.events as event
  join public.event_participants as participant on participant.event_id = event.id
  where participant.user_id = p_user_id
    and participant.status = 'invited'
    and event.status = 'open'
    and event.game = 'confia_o_traeix';

  update public.event_participants
  set status = 'declined'
  where user_id = p_user_id and status = 'invited';

  foreach duel_id in array coalesce(duels, '{}') loop
    select * into duel from public.events where id = duel_id for update;
    if duel.status = 'open' then
      perform private.cancel_open_event(duel, duel.creator_id);
    end if;
  end loop;

  update public.profiles
  set removed_at = now()
  where user_id = p_user_id;
end;
$$;
