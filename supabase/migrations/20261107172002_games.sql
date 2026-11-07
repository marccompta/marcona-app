-- REQ-121, REQ-122, REQ-146, REQ-147: the games the admin can run, and what an
-- event needs to be one. A game event keeps its own copy of the settings, so
-- later changes leave it alone (REQ-149). See ADR 0005.
create table public.games (
  id text primary key,
  enabled boolean not null default true,
  description text not null check (description = btrim(description) and char_length(description) between 1 and 1000),
  settings jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.games enable row level security;

revoke all on table public.games from anon, authenticated;
grant select on table public.games to authenticated;

create policy "Active users can read games"
  on public.games
  for select
  to authenticated
  using ((select private.is_active()));

insert into public.games (id, description, settings)
values (
  'confia_o_traeix',
  'Dues persones, una decisió secreta. Cadascuna tria Confia o Traeix sense saber què fa l''altra, i ningú veu res fins que totes dues han triat.',
  '{"both_trust": 150, "betrayer": 250, "betrayed": 0, "both_betray": 50}'
);

alter table public.events drop constraint events_type_check;
alter table public.events add constraint events_type_check check (type in ('classic', 'game'));

-- A game's payouts come from its settings, so these only apply to classic events.
alter table public.events
  alter column payout_first drop not null,
  alter column payout_second drop not null,
  alter column payout_third drop not null;

alter table public.events
  add column game text references public.games (id),
  add column settings jsonb,
  add column phase text check (phase in ('inviting', 'choosing', 'revealed')),
  add column reveal jsonb,
  add column creator_plays boolean not null default true;

alter table public.events add constraint events_fields_match_type check (
  (type = 'classic' and game is null and settings is null and phase is null and reveal is null
    and payout_first is not null and payout_second is not null and payout_third is not null)
  or (type = 'game' and game is not null and settings is not null and phase is not null
    and payout_first is null and payout_second is null and payout_third is null)
);

create index events_game_idx on public.events (game);
