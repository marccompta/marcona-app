# Slice 007 design

## Approach

This reuses the engine from slice 005. `create_game_event()` accepts La minoria, a new `start_game()` moves it from `inviting` to `choosing`, and `private.resolve_game()` gains a branch for it. The refresh, reveal and admin settings screens are reused. Unlike a duel, `game_state()` also returns who has locked in, and `lock_in()` rejects a second choice.

## Affected components

| Component | Change |
|---|---|
| `supabase/migrations/` | Game seed, `start_game()`, the resolution branch |
| `src/` | Start button, option labels, reveal for several players, admin labels |
| `tests/` | Hosted payout, remainder, tie and permission tests, plus a browser test |

## Data changes

A new row in `games` for La minoria, with the default labels Blanc and Negre. The labels are copied onto each event with the other settings.

## Decisions

- [ADR 0005](../../docs/adr/0005-server-decided-admin-run-games.md) applies. No new ADR.
- Creation is rejected if too few people are invited to ever reach 3 players, so a game can't get stuck from the start.
- A forced game skips `inviting` and starts in `choosing`, because nobody is left to wait for.
- A player can see their own locked-in choice, through a small `my_choice()` function. Duels don't allow this.
- Lock-in order comes from the stored sequence, not from timestamps, so there are no ties.

## Tooling needed

None.

## Risks

| Risk | Mitigation |
|---|---|
| The engine turns out to need changes | Slice 005's tests guard duels while it changes |

## How this will be reviewed

On the phone as the admin, with Claude's script playing the demo accounts, for one game. It should take 5 to 10 minutes. Remainders and ties are covered by tests.
