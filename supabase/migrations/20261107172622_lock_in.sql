-- REQ-125, REQ-139, REQ-202, REQ-204: the secret choices, out of the API's reach.
-- This schema isn't exposed, and the table is in no Realtime publication. See
-- ADR 0005.
create table private.choices (
  event_id uuid not null references public.events (id),
  user_id uuid not null references public.profiles (user_id),
  choice text not null,
  lock_order bigint generated always as identity,
  primary key (event_id, user_id)
);

create index choices_user_id_idx on private.choices (user_id);

alter table private.choices enable row level security;
revoke all on table private.choices from public, anon, authenticated, service_role;

-- Filled in by the next migration, which pays out.
create function private.resolve_game(p_event public.events)
returns void
language plpgsql
set search_path = ''
as $$
begin
  return;
end;
$$;

revoke all on function private.resolve_game(public.events) from public, anon, authenticated, service_role;

-- REQ-194: writes only to the private schema, so no public table changes until
-- the reveal. The event's lock comes before the claim, as in answer_invitation(),
-- and it's what makes two taps at the same moment take turns.
create function public.lock_in(p_request_id uuid, p_event_id uuid, p_choice text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.events;
  outcome jsonb;
  everyone_chose boolean;
begin
  if not (select private.is_active()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select * into target from public.events where id = p_event_id and type = 'game' for update;

  if not found then
    raise exception 'event_not_found';
  end if;

  outcome := private.claim_request(actor, p_request_id, 'lock_in');
  if outcome is not null then
    return outcome;
  end if;

  if not exists (
    select 1
    from public.event_participants
    where event_id = p_event_id and user_id = actor and status = 'accepted'
  ) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if target.status = 'cancelled' then
    raise exception 'event_not_open';
  end if;

  -- REQ-204: too late to change anything, so the app shows the reveal.
  if target.phase = 'revealed' then
    return private.finish_request(
      actor,
      p_request_id,
      jsonb_build_object('event_id', p_event_id, 'saved', false, 'revealed', true)
    );
  end if;

  if target.phase <> 'choosing' then
    raise exception 'game_not_choosing';
  end if;

  if p_choice is null or p_choice not in ('confia', 'traeix') then
    raise exception 'invalid_game_choice';
  end if;

  insert into private.choices (event_id, user_id, choice)
  values (p_event_id, actor, p_choice)
  on conflict (event_id, user_id) do update set choice = excluded.choice;

  select count(*) = (
    select count(*) from public.event_participants where event_id = p_event_id and status = 'accepted'
  ) into everyone_chose
  from private.choices
  where event_id = p_event_id;

  -- REQ-127: in this same transaction.
  if everyone_chose then
    perform private.resolve_game(target);
  end if;

  return private.finish_request(
    actor,
    p_request_id,
    jsonb_build_object('event_id', p_event_id, 'saved', true, 'revealed', everyone_chose)
  );
end;
$$;

revoke all on function public.lock_in(uuid, uuid, text) from public, anon, service_role;
grant execute on function public.lock_in(uuid, uuid, text) to authenticated;
