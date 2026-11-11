-- REQ-168: the wipe's lock, which starts open. Only lock_wipe() changes it, and
-- nothing opens it again.
insert into public.app_settings (key, value) values ('wipe', '{"locked": false}');

create function private.wipe_locked()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select (value ->> 'locked')::boolean from public.app_settings where key = 'wipe'), false);
$$;

revoke all on function private.wipe_locked() from public, anon, authenticated, service_role;

-- REQ-167, REQ-168: whether the wipe is locked, for the admin screen.
create function public.wipe_state()
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

  return jsonb_build_object('locked', private.wipe_locked());
end;
$$;

revoke all on function public.wipe_state() from public, anon, service_role;
grant execute on function public.wipe_state() to authenticated;

-- REQ-167, REQ-168: locks the wipe for the live event. Locking again changes nothing.
create function public.lock_wipe()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.app_settings
  set value = '{"locked": true}', updated_at = now()
  where key = 'wipe';

  return jsonb_build_object('locked', true);
end;
$$;

revoke all on function public.lock_wipe() from public, anon, service_role;
grant execute on function public.lock_wipe() to authenticated;

-- REQ-165 to REQ-168: as before, now refusing once the wipe is locked, whatever
-- word comes with it.
create or replace function public.admin_wipe(p_confirmation text)
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

  if private.wipe_locked() then
    raise exception 'wipe_locked';
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
