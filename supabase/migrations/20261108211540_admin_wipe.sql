-- REQ-059, REQ-165: the ledger stays append-only, except while admin_wipe()
-- runs. It sets a transaction-local flag that no API request can set, and clears
-- it before returning. Truncating is still always refused.
create or replace function private.reject_ledger_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and current_setting('marcona.wiping', true) = 'on' then
    return old;
  end if;

  raise exception 'ledger_is_append_only';
end;
$$;

-- REQ-165 to REQ-167: deletes every user but the admin, with their Auth
-- accounts and sessions, plus every event, choice, movement and request record,
-- and sets the admin's balance to 0. The settings and games stay. It's one
-- transaction, so it happens completely or not at all. The tables are locked
-- first, so no movement can slip in while it runs. The owner can delete Auth
-- users, so no secret key is needed, and their sessions and identities go with
-- them.
create function public.admin_wipe(p_confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_id uuid := (select auth.uid());
  removed_users integer;
  removed_events integer;
  removed_movements integer;
begin
  if not (select private.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if p_confirmation is distinct from 'ESBORRA' then
    raise exception 'wipe_not_confirmed';
  end if;

  lock table public.profiles, public.events, public.event_participants, public.ledger,
    private.choices, private.money_requests in exclusive mode;

  perform set_config('marcona.wiping', 'on', true);

  delete from private.choices where true;
  delete from private.money_requests where true;
  delete from public.ledger where true;
  get diagnostics removed_movements = row_count;
  delete from public.event_participants where true;
  delete from public.events where true;
  get diagnostics removed_events = row_count;

  update public.profiles set balance = 0 where user_id = admin_id;
  -- Their profiles go with them.
  delete from auth.users where id <> admin_id;
  get diagnostics removed_users = row_count;

  perform set_config('marcona.wiping', '', true);

  return jsonb_build_object('users', removed_users, 'events', removed_events, 'movements', removed_movements);
end;
$$;

revoke all on function public.admin_wipe(text) from public, anon, service_role;
grant execute on function public.admin_wipe(text) to authenticated;

-- Matches the other admin functions, which the secret key never calls.
revoke all on function public.admin_export() from service_role;
