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

## Notes from slice 005

Slice 005 built the engine for duels. The full list is under Gotchas in [its record](../005-confia-o-traeix/record.md).

- **More than `resolve_game()` needs a branch:**
  - the player count in `create_game_event()`, where the duel's "exactly 2" check is marked for this;
  - the allowed choices in `lock_in()`;
  - its `on conflict do update`, which replaces a pick and must refuse one for La minoria (REQ-205);
  - `set_game_settings()`, with its own `private.valid_*` checker;
  - the admin form and its worked example.
- **`game_state()` shows lock-ins for La minoria only.** It must stay silent for duels (REQ-194), and it applies the `is_test` separation itself, as it's security definer.
- **Lock the event before claiming the request,** in any function that can meet a game. Claiming takes a shared lock on the caller's row, and the reveal pays players while holding the event, so the other order deadlocks. `create_game_event()` locks its players first, like `spin()`.
- **Before the reveal, `lock_in()` writes to no public table,** and payouts name the creator as the actor, so nothing shows who tapped last.
- **Game rules live twice:** in the migrations and in `tests/e2e/fake-supabase.ts`.
- **Rules are tested as the real admin:** the admin can't invite test accounts, so they go in `tests/sql/games.sql`. The hosted tests play `demo-nuria` and `demo-pau`.
- **A `case` inside a PL/pgSQL `if` needs brackets,** because the condition ends at the first `then`. The error says "syntax error at end of input".

## How this will be reviewed

On the phone as the admin, with Claude's script playing the demo accounts, for one game. It should take 5 to 10 minutes. Remainders and ties are covered by tests.
