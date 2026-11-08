-- REQ-197, REQ-194: game_state() also says who has locked in, for La minoria only.
-- It lists them by user ID, not in the order they picked, and never a choice. A
-- duel's state is as in slice 005, the same whoever asks and whoever has picked.
create or replace function public.game_state(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target public.events;
  state jsonb;
begin
  if not (select private.is_active()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select event.* into target
  from public.events as event
  join public.profiles as creator on creator.user_id = event.creator_id
  where event.id = p_event_id
    and event.type = 'game'
    and creator.is_test = (select private.is_test_account());

  if not found then
    raise exception 'event_not_found';
  end if;

  state := jsonb_build_object(
    'event_id', target.id,
    'game', target.game,
    'status', target.status,
    'phase', target.phase,
    'settings', target.settings,
    'reveal', target.reveal
  );

  if target.game = 'la_minoria' then
    state := state || jsonb_build_object('locked_in', coalesce(
      (select jsonb_agg(choice.user_id order by choice.user_id) from private.choices as choice where choice.event_id = target.id),
      '[]'::jsonb
    ));
  end if;

  return state;
end;
$$;

-- A La minoria player can read back their own choice, which is final, so they can
-- check it. Anyone else reads null. A duel refuses, as nobody may learn whether a
-- duel player has picked (REQ-194).
create function public.my_choice(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target public.events;
begin
  if not (select private.is_active()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select event.* into target
  from public.events as event
  join public.profiles as creator on creator.user_id = event.creator_id
  where event.id = p_event_id
    and event.type = 'game'
    and creator.is_test = (select private.is_test_account());

  if not found then
    raise exception 'event_not_found';
  end if;

  if target.game <> 'la_minoria' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  return jsonb_build_object('choice', (
    select choice.choice
    from private.choices as choice
    where choice.event_id = target.id and choice.user_id = (select auth.uid())
  ));
end;
$$;

revoke all on function public.my_choice(uuid) from public, anon, service_role;
grant execute on function public.my_choice(uuid) to authenticated;
