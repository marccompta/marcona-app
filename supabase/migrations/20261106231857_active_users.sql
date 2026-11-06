-- Who counts as active, and the columns that money and removal need.
create schema if not exists private;

-- Policies run as the caller, so logged-in users need to reach these helpers.
-- The schema isn't exposed through the API, so nobody can call them directly.
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter table public.profiles
  add column balance bigint not null default 0 check (balance >= 0),
  add column removed_at timestamptz,
  add column is_test boolean not null default false;

-- REQ-056: exactly one admin.
create unique index profiles_one_admin on public.profiles (role) where role = 'admin';

-- REQ-053: access tokens outlive a removal, so every policy and function asks this.
create function private.is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid()) and removed_at is null
  );
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid()) and removed_at is null and role = 'admin'
  );
$$;

-- Accounts made by automated tests only see each other.
create function private.is_test_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select is_test from public.profiles where user_id = (select auth.uid());
$$;

revoke all on function private.is_active(), private.is_admin(), private.is_test_account() from public, anon;
grant execute on function private.is_active(), private.is_admin(), private.is_test_account() to authenticated;

drop policy "Logged-in users can read profiles" on public.profiles;

create policy "Active users can read profiles"
  on public.profiles
  for select
  to authenticated
  using ((select private.is_active()) and is_test = (select private.is_test_account()));

-- The admin-users Edge Function writes profiles with the secret key.
grant select, insert, update on table public.profiles to service_role;

create or replace function public.rls_report()
returns table (schema_name text, table_name text)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  return query
    select n.nspname::text, c.relname::text
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'private')
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
    order by 1, 2;
end;
$$;

-- REQ-053: nobody needs to call this event trigger function through the API.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Stop here if that revoke broke the trigger that protects new tables.
do $$
declare
  protected boolean;
begin
  create table public.rls_auto_enable_probe (id integer);
  select relrowsecurity into protected
  from pg_catalog.pg_class
  where oid = 'public.rls_auto_enable_probe'::regclass;
  drop table public.rls_auto_enable_probe;

  if not protected then
    raise exception 'ensure_rls no longer turns on Row Level Security';
  end if;
end;
$$;
