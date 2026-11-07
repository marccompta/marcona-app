# 0005. Games are decided on the server, and only the admin creates them

- **Status:** accepted
- **Date:** 2026-11-06
- **Slice:** 005

## Context and problem

Games depend on secret choices, and roulette and game outcomes must be fair. Anyone can call the API, so secrets must be out of reach of every API route. Letting any user start a duel would also let two friends who trust each other create marcones without limit.

## Options considered

- Secret choices in a private schema that the API can't reach, read only through functions
- Secret choices in a public table protected by Row Level Security, where one wrong policy would leak them
- Any user creates games, with a limit on duels per pair
- Only the admin creates games, and may or may not play

## Decision

Choices live in a private schema that isn't exposed by the API or published to Realtime. The last lock-in reveals and pays out in the same transaction. Randomness comes from a secure server-side source. Only the admin can create a game, as the human decided, so no per-pair limit is needed.

## Consequences

- Good: a mistake in a policy can't leak a choice, because no policy applies.
- Good: the admin controls how many duels happen, so the default payouts can stay.
- Bad: a game needs the admin to set it up.
- Bad: the project owner can still read choices in the Supabase dashboard, as can Claude through MCP. This protection covers the API and Realtime only.
