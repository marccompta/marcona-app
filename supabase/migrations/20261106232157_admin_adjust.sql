-- Remembers each money action, so a repeat returns the first result (REQ-062).
-- It lives outside the API: only functions that own it can reach it.
create table private.money_requests (
  user_id uuid not null references public.profiles (user_id),
  request_id uuid not null,
  action text not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);

alter table private.money_requests enable row level security;
revoke all on table private.money_requests from public, anon, authenticated, service_role;

-- Errors are codes, which the app turns into Catalan. See ADR 0006.
create function public.admin_adjust(
  p_request_id uuid,
  p_user_id uuid,
  p_action text,
  p_amount numeric,
  p_concept text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  concept text := btrim(p_concept);
  movement public.ledger;
  outcome jsonb;
begin
  if not (select private.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if concept is null or concept = '' then
    raise exception 'concept_required';
  end if;

  if p_action is null or p_action not in ('add', 'remove') then
    raise exception 'invalid_action';
  end if;

  if p_amount is null or p_amount < 1 or p_amount > 1000000000 or p_amount <> trunc(p_amount) then
    raise exception 'invalid_amount';
  end if;

  -- A second send waits here for the first to commit, then finds its result.
  insert into private.money_requests (user_id, request_id, action)
  values (actor, p_request_id, 'admin_adjust')
  on conflict do nothing;

  if not found then
    select result into outcome
    from private.money_requests
    where user_id = actor and request_id = p_request_id;
    return outcome;
  end if;

  movement := private.apply_movement(
    p_user_id,
    case when p_action = 'add' then p_amount else -p_amount end::bigint,
    'admin_adjustment',
    concept,
    null,
    actor
  );

  outcome := jsonb_build_object(
    'movement_id', movement.id,
    'user_id', movement.user_id,
    'delta', movement.delta,
    'balance_after', movement.balance_after
  );

  update private.money_requests
  set result = outcome
  where user_id = actor and request_id = p_request_id;

  return outcome;
end;
$$;

revoke all on function public.admin_adjust(uuid, uuid, text, numeric, text) from public, anon, service_role;
grant execute on function public.admin_adjust(uuid, uuid, text, numeric, text) to authenticated;
