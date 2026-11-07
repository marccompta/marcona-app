-- Events, the people in them, and the helpers every event function shares.
-- Locks are always taken in the same order, the event first and then users by
-- ID, so two money actions can't deadlock. See ADR 0004.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'classic' check (type in ('classic')),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 40),
  buy_in bigint not null check (buy_in >= 1),
  creator_id uuid not null references public.profiles (user_id),
  status text not null default 'open' check (status in ('open', 'completed', 'cancelled')),
  payout_first smallint not null check (payout_first >= 0),
  payout_second smallint not null check (payout_second >= 0),
  payout_third smallint not null check (payout_third >= 0),
  results jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  finished_by uuid references public.profiles (user_id),
  constraint events_payouts_sum_to_100 check (payout_first + payout_second + payout_third = 100)
);

create index events_creator_id_idx on public.events (creator_id);
create index events_finished_by_idx on public.events (finished_by);

create table public.event_participants (
  event_id uuid not null references public.events (id),
  user_id uuid not null references public.profiles (user_id),
  status text not null check (status in ('invited', 'accepted', 'declined', 'lapsed')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index event_participants_user_id_idx on public.event_participants (user_id, status);

alter table public.events enable row level security;
alter table public.event_participants enable row level security;

revoke all on table public.events, public.event_participants from anon, authenticated;
grant select on table public.events, public.event_participants to authenticated;

-- The subqueries run under the profiles policy, so test accounts and real users
-- each see only their own events, as with the ledger.
create policy "Active users can read events"
  on public.events
  for select
  to authenticated
  using ((select private.is_active()) and creator_id in (select user_id from public.profiles));

create policy "Active users can read event participants"
  on public.event_participants
  for select
  to authenticated
  using ((select private.is_active()) and user_id in (select user_id from public.profiles));

-- REQ-083: only open events change, whoever is asking.
create function private.reject_finished_event_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'open' then
    raise exception 'event_not_open';
  end if;
  return new;
end;
$$;

revoke all on function private.reject_finished_event_change() from public, anon, authenticated, service_role;

create trigger events_finished_stay_finished
  before update on public.events
  for each row execute function private.reject_finished_event_change();

-- REQ-099: buy-ins, refunds and payouts are movements linked to their event.
alter table public.ledger drop constraint ledger_kind_check;
alter table public.ledger add constraint ledger_kind_check
  check (kind in ('admin_adjustment', 'event_buy_in', 'event_refund', 'event_payout'));

alter table public.ledger add constraint ledger_event_id_fkey
  foreign key (event_id) references public.events (id);

create index ledger_event_id_idx on public.ledger (event_id);

-- REQ-062: claims a client request ID. Returns null if this call is the first,
-- or what the first call returned. A second send waits on the insert until the
-- first commits, and a refused action rolls its claim back.
create function private.claim_request(p_user_id uuid, p_request_id uuid, p_action text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  stored jsonb;
begin
  insert into private.money_requests (user_id, request_id, action)
  values (p_user_id, p_request_id, p_action)
  on conflict do nothing;

  if found then
    return null;
  end if;

  select result into stored
  from private.money_requests
  where user_id = p_user_id and request_id = p_request_id;
  return stored;
end;
$$;

create function private.finish_request(p_user_id uuid, p_request_id uuid, p_result jsonb)
returns jsonb
language sql
set search_path = ''
as $$
  update private.money_requests
  set result = p_result
  where user_id = p_user_id and request_id = p_request_id
  returning result;
$$;

revoke all on function private.claim_request(uuid, uuid, text), private.finish_request(uuid, uuid, jsonb)
  from public, anon, authenticated, service_role;

create function public.create_event(
  p_request_id uuid,
  p_name text,
  p_buy_in numeric,
  p_invitees uuid[],
  p_payout_first numeric,
  p_payout_second numeric,
  p_payout_third numeric
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
  outcome jsonb;
begin
  if not (select private.is_active()) then
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

  -- Holding these rows means nobody here can be removed before this commits.
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

  insert into public.events (name, buy_in, creator_id, payout_first, payout_second, payout_third)
  values (event_name, p_buy_in::bigint, actor, p_payout_first::smallint, p_payout_second::smallint, p_payout_third::smallint)
  returning id into created_id;

  insert into public.event_participants (event_id, user_id, status)
  values (created_id, actor, 'accepted');

  insert into public.event_participants (event_id, user_id, status)
  select created_id, invitee, 'invited'
  from unnest(invitees) as invitee;

  perform private.apply_movement(actor, -p_buy_in::bigint, 'event_buy_in', null, created_id, actor);

  return private.finish_request(actor, p_request_id, jsonb_build_object('event_id', created_id));
end;
$$;

revoke all on function public.create_event(uuid, text, numeric, uuid[], numeric, numeric, numeric) from public, anon, service_role;
grant execute on function public.create_event(uuid, text, numeric, uuid[], numeric, numeric, numeric) to authenticated;
