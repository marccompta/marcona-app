-- The people who can log in. Slice 002 extends this table.
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_-]{3,20}$'),
  role text not null default 'player' check (role in ('admin', 'player')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Logged-in users can read, and nobody can write from the browser.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

create policy "Logged-in users can read profiles"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Lists every table that has Row Level Security turned off. An empty result
-- is the goal. Only the admin can call it.
create function public.rls_report()
returns table (schema_name text, table_name text)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid()) and role = 'admin'
  ) then
    raise exception 'Only the admin can read the RLS report' using errcode = '42501';
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

revoke all on function public.rls_report() from public, anon;
grant execute on function public.rls_report() to authenticated;
