-- REQ-128, REQ-194: how the app reads a game. Before the reveal it returns the
-- same thing whoever asks and whoever has locked in, because it reads nothing
-- about choices. Test accounts and real users each see only their own, as with
-- the events policy, which a security definer function has to apply itself.
create function public.game_state(p_event_id uuid)
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

  return jsonb_build_object(
    'event_id', target.id,
    'game', target.game,
    'status', target.status,
    'phase', target.phase,
    'settings', target.settings,
    'reveal', target.reveal
  );
end;
$$;

revoke all on function public.game_state(uuid) from public, anon, service_role;
grant execute on function public.game_state(uuid) to authenticated;
