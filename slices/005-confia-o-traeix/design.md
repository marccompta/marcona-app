# Slice 005 design

## Approach

`create_game_event()` is admin-only. It copies the game's settings onto the event, and charges the admin only if they're playing. A game has a phase: `inviting`, `choosing` or `revealed`. A duel moves to `choosing` once both players have paid. With forced participation, it starts there.

`lock_in()` locks the event row, stores or replaces the choice in the `private` schema, and, if every player now has one, calls `private.resolve_game()` in the same transaction. That function copies the choices into `events.reveal`, pays out and completes the event. It branches by game, so slice 007 only adds a branch.

`lock_in()` writes only to `private.choices`, so no public table changes until the reveal.

`game_state()` is how the app reads a game. Before a duel's reveal, it returns the same thing whoever asks and whoever has locked in. Afterwards, it returns the full results.

A duel's event screen has one resting state for everyone: the rules, the payoffs and a button that opens the private choice panel. The panel always shows the same two buttons, and stays open until the player closes it. Each tap replaces the player's choice, until both players have picked. Once the server confirms a tap, that button glows for two seconds and goes back to normal. The moment the second player makes their first pick, the game is revealed, so the last tap before that is the one that counts.

## Affected components

| Component | Change |
|---|---|
| `supabase/migrations/` | Games, phases, private choices, functions, updated invitations and removal |
| `src/` | Event type choice, game event detail, reveal, admin game settings |
| `tests/` | `tests/sql/games.sql` for the rules and payouts, hosted secrecy, permission and concurrency tests, plus unit and browser tests |

## Data changes

- New `games` table: ID, on or off, Catalan description, and settings as JSON. Confia o traeix is seeded with the default payouts.
- `events` gains `game`, `settings` (the copy), `phase`, `reveal` and whether the creator plays.
- New `private.choices` table: event, user, choice and lock-in order. It's in a schema the API doesn't expose, and it's never published to Realtime.

## Decisions

- [ADR 0005](../../docs/adr/0005-server-decided-admin-run-games.md): server-decided games, created only by the admin.
- Nobody can see a locked-in choice before the reveal, including the player who made it. A player who's unsure can simply tap again.
- The buttons stay behind the panel so a stray tap while reading the rules can't lock in a choice.
- The glow waits for the server's answer, so it always means the tap was saved. A lost response is retried with the same client request ID, and if that fails, the app shows a Catalan connection error.
- Taps go to the server one at a time, and only the newest waiting tap is kept, so a slow network can't make an older tap win.
- On the tap that completes the pair, the glow plays first and then the reveal starts.
- Nobody sees lock-ins in a duel, including the admin when not playing. If a duel gets stuck, the admin asks both players or cancels it.
- Choices can only be locked in during `choosing`, so a duel waits for both players to pay.
- The event screen polls `game_state()` every 3 seconds from when it opens until the reveal, whether or not the player has locked in. This works without slice 006.
- A payout of 0 creates no ledger row, and the event detail still shows it.
- When the admin doesn't play, they appear as the organiser, with the crown, and not in the player list.
- Payout percentages are whole numbers from 0 to 1000.
- Only the admin can create a game, and the admin can't invite test accounts, so the rules are tested in a rolled-back SQL file, as forced participation is. Hosted duels use the `demo-` accounts, and only for what needs the real API: secrecy and concurrency.
- `lock_in()` and every function that can meet a game lock the event before claiming the request. Claiming takes a shared lock on the caller's row, so a tap that claimed first would deadlock with the reveal paying that player.

## Tooling needed

None.

## Risks

| Risk | Mitigation |
|---|---|
| A choice leaks through a function, a log or a Realtime message | Choices are out of the API's reach, and tests try each route as a player |
| The engine fits duels but not La minoria | Lock-in order is stored now, and resolution branches by game |
| A lock-in shows up through polling or Realtime | `lock_in()` touches no public table, and a test compares `game_state()` before and after |
| Someone watches a player tap | The app can't hide that moment. It hides the state afterwards, and the review says so |
| The second player's first tap is final, and they can't know they're second | This follows from revealing once both have picked. The buttons are behind the panel and spaced well apart |
| A change lands at the same moment as the other player's first pick | `lock_in()` locks the event row, so one goes first. If the reveal wins, the late tap is ignored |
| Two players lock in at once and the game pays twice | `lock_in()` locks the event row, and a concurrency test covers it |
| This slice is the largest review | The settings screen comes last, so the review can focus on one duel |

## How this will be reviewed

On the phone as the admin, with Claude's script playing the demo accounts. Play one duel yourself: compare the screen before and after you pick, then change your pick, and check that your last tap is what's revealed. Then set up one without playing, change a setting and watch the worked example. It should take about 10 minutes. Secrecy and payouts are covered by tests.
