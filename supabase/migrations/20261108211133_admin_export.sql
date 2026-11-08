-- REQ-164, REQ-167: everything the admin needs to keep a record of the event,
-- as one JSON value. Users include test accounts and removed users. Each event
-- carries its people. Secret choices live in private.choices, which this never
-- reads, so an unrevealed choice can't reach the file. A revealed one is
-- already public in the event's reveal.
create function public.admin_export()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'users', coalesce(
      (select jsonb_agg(to_jsonb(profile) order by profile.created_at, profile.username) from public.profiles as profile),
      '[]'
    ),
    'events', coalesce(
      (
        select jsonb_agg(
          to_jsonb(event) || jsonb_build_object('participants', coalesce(
            (
              select jsonb_agg(
                jsonb_build_object('user_id', participant.user_id, 'status', participant.status, 'created_at', participant.created_at)
                order by participant.created_at, participant.user_id
              )
              from public.event_participants as participant
              where participant.event_id = event.id
            ),
            '[]'
          ))
          order by event.created_at, event.id
        )
        from public.events as event
      ),
      '[]'
    ),
    'ledger', coalesce((select jsonb_agg(to_jsonb(movement) order by movement.id) from public.ledger as movement), '[]')
  );
end;
$$;

revoke all on function public.admin_export() from public, anon;
grant execute on function public.admin_export() to authenticated;
