-- The append-only record of every change to a balance, and the one helper that
-- changes a balance. See ADR 0004.
create table public.ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (user_id),
  delta bigint not null check (delta <> 0),
  balance_after bigint not null check (balance_after >= 0),
  kind text not null check (kind in ('admin_adjustment')),
  concept text,
  event_id uuid,
  actor_id uuid references public.profiles (user_id),
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index ledger_user_id_idx on public.ledger (user_id, id desc);
create index ledger_actor_id_idx on public.ledger (actor_id);

alter table public.ledger enable row level security;

revoke all on table public.ledger from anon, authenticated;
grant select on table public.ledger to authenticated;

-- The subquery runs under the profiles policy, so test accounts and real users
-- each see only their own movements. Removed users' rows stay visible.
create policy "Active users can read the ledger"
  on public.ledger
  for select
  to authenticated
  using ((select private.is_active()) and user_id in (select user_id from public.profiles));

-- REQ-059: nobody changes history, not even the owner. Slice 008's wipe is the
-- one planned exception.
create function private.reject_ledger_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'ledger_is_append_only';
end;
$$;

revoke all on function private.reject_ledger_change() from public, anon, authenticated;

create trigger ledger_append_only
  before update or delete on public.ledger
  for each row execute function private.reject_ledger_change();

create trigger ledger_no_truncate
  before truncate on public.ledger
  for each statement execute function private.reject_ledger_change();

-- REQ-057: every change to marcones goes through here, inside the caller's
-- transaction. The row lock makes concurrent movements on one user wait.
create function private.apply_movement(
  p_user_id uuid,
  p_delta bigint,
  p_kind text,
  p_concept text default null,
  p_event_id uuid default null,
  p_actor_id uuid default null,
  p_details jsonb default '{}'
)
returns public.ledger
language plpgsql
set search_path = ''
as $$
declare
  current_balance bigint;
  movement public.ledger;
begin
  select balance into current_balance
  from public.profiles
  where user_id = p_user_id and removed_at is null
  for update;

  if not found then
    raise exception 'user_not_found';
  end if;

  if current_balance + p_delta < 0 then
    raise exception 'insufficient_balance';
  end if;

  update public.profiles
  set balance = current_balance + p_delta
  where user_id = p_user_id;

  insert into public.ledger (user_id, delta, balance_after, kind, concept, event_id, actor_id, details)
  values (p_user_id, p_delta, current_balance + p_delta, p_kind, p_concept, p_event_id, p_actor_id, p_details)
  returning * into movement;

  return movement;
end;
$$;

revoke all on function private.apply_movement(uuid, bigint, text, text, uuid, uuid, jsonb)
  from public, anon, authenticated, service_role;
