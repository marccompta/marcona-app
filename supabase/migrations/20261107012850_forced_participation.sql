-- REQ-186 to REQ-190: the admin can force every invitee in. Only the admin can
-- ask for it, and it's all or nothing: if anyone is short, nobody is charged.
drop function public.create_event(uuid, text, numeric, uuid[], numeric, numeric, numeric);

create function public.create_event(
  p_request_id uuid,
  p_name text,
  p_buy_in numeric,
  p_invitees uuid[],
  p_payout_first numeric,
  p_payout_second numeric,
  p_payout_third numeric,
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
  payouts numeric[] := array[p_payout_first, p_payout_second, p_payout_third];
  invitees uuid[];
  created_id uuid;
  short text;
  player record;
  outcome jsonb;
begin
  if not (select private.is_active()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if p_force and not (select private.is_admin()) then
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

  if exists (select 1 from unnest(payouts) as payout where payout is null or payout < 0 or payout <> trunc(payout))
    or p_payout_first + p_payout_second + p_payout_third <> 100 then
    raise exception 'invalid_percentages';
  end if;

  select array_agg(distinct invitee) into invitees
  from unnest(p_invitees) as invitee
  where invitee is not null;

  if invitees is null then
    raise exception 'no_invitees';
  end if;

  outcome := private.claim_request(actor, p_request_id, 'create_event');
  if outcome is not null then
    return outcome;
  end if;

  -- Holding these rows means nobody here can be removed or spend their marcones
  -- before this commits.
  perform 1
  from public.profiles
  where user_id = actor or user_id = any (invitees)
  order by user_id
  for update;

  -- REQ-078: other active users, of the same kind as the creator.
  if actor = any (invitees) or cardinality(invitees) <> (
    select count(*)
    from public.profiles
    where user_id = any (invitees)
      and removed_at is null
      and is_test = (select private.is_test_account())
  ) then
    raise exception 'invalid_invitee';
  end if;

  -- REQ-189: the app words this in Catalan, from the usernames in the detail.
  if p_force then
    select string_agg(username, ', ' order by username) into short
    from public.profiles
    where user_id = any (invitees) and balance < p_buy_in;

    if short is not null then
      raise exception 'forced_insufficient_balance' using detail = short;
    end if;
  end if;

  insert into public.events (name, buy_in, creator_id, payout_first, payout_second, payout_third)
  values (event_name, p_buy_in::bigint, actor, p_payout_first::smallint, p_payout_second::smallint, p_payout_third::smallint)
  returning id into created_id;

  insert into public.event_participants (event_id, user_id, status)
  values (created_id, actor, 'accepted');

  insert into public.event_participants (event_id, user_id, status)
  select created_id, invitee, case when p_force then 'accepted' else 'invited' end
  from unnest(invitees) as invitee;

  -- REQ-072, REQ-188, REQ-190: everyone who's in pays now, and the creator made
  -- each charge, so a forced buy-in shows the admin in the audit.
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

revoke all on function public.create_event(uuid, text, numeric, uuid[], numeric, numeric, numeric, boolean) from public, anon, service_role;
grant execute on function public.create_event(uuid, text, numeric, uuid[], numeric, numeric, numeric, boolean) to authenticated;
