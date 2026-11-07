# Slice 005 record

Written after human approval. Once the slice closes, this file is frozen.

- **Closed:** 2026-11-07
- **Commits:** `git log --grep "Slice: 005"`
- **Requirements:** REQ-121 to REQ-125, REQ-127 to REQ-129, REQ-131 to REQ-135, REQ-139 to REQ-149, REQ-175 to REQ-184, REQ-191, REQ-194, REQ-195, REQ-198, REQ-202, REQ-204, REQ-210. REQ-203 was replaced by REQ-210 in review.

## What shipped

The admin can run Confia o traeix, a secret duel between two people, playing in it or not.

- A **Tipus** choice on the new event form, for the admin only, with the option to play.
- The secret-choice engine: `create_game_event()`, `lock_in()`, `private.resolve_game()` and `game_state()`, with choices in `private.choices`.
- Forced duels, and duels that cancel and refund on a decline or a removal.
- A game's event screen, with the rules, the payoffs for its buy-in, and one resting screen for everyone.
- A private panel with two cards, where each tap replaces the last until both have picked, and the tapped card's border glows for 0.7 seconds.
- Automatic refresh every 3 seconds, and a reveal where two cards turn one at a time, with the winner's celebration from roulette.
- Game settings under **Administració**, with a worked example that follows the numbers.
- `tests/sql/games.sql`, and `npm run demo -- pick` for reviews.

## Why

Hidden choices and betrayal are what make the night special, and they only work if nobody can peek. [ADR 0005](../../docs/adr/0005-server-decided-admin-run-games.md) puts the choices in a schema the API can't reach, so no policy mistake can leak one, and keeps game creation with the admin, so two friends can't farm marcones. Money follows [ADR 0004](../../docs/adr/0004-money-in-postgres-functions.md): functions, one transaction, a client request ID.

## How it works

- **Creating:** `create_game_event()` locks the players' rows, claims the request, checks the game is on and there are exactly two different players, and stores a copy of the settings and the description in `events.settings`. A forced duel starts in the `choosing` phase, and any other in `inviting`.
- **Joining:** `answer_invitation()` moves a duel to `choosing` once nobody is left invited. A decline calls `private.cancel_open_event()`. `remove_profile()` does the same for an invited player, with the creator as the actor.
- **Picking:** `lock_in()` locks the event, claims the request, and upserts into `private.choices`. It touches no public table until the last pick. When everyone has chosen, it calls `private.resolve_game()` in the same transaction. A tap after the reveal returns `saved: false`, and the app goes to the reveal with no glow.
- **Paying:** `private.resolve_game()` branches by game. `private.duel_reveal()` works out each player's percentage from `events.settings`, and rounds down. Payouts are `event_payout` movements with the creator as the actor, so nothing shows who tapped last, and a payout of 0 writes none.
- **Reading:** `game_state()` reads nothing about choices, so it can't differ by who asks or who has picked. It's security definer, so it applies the `is_test` separation itself.
- **Tapping:** `createTapQueue()` in `src/lib/games.ts` sends one tap at a time and keeps only the newest waiting one. A lost reply is sent once more with the same request ID. The client gives a failed fetch no code, so `lockIn()` turns that into a `TypeError`, which `errorMessage()` words as a lost connection.
- **The screen:** `src/screens/GameEvent.tsx` holds the taps, the polling and the panel. The panel is a portal on `body`. The tap that completes the pair holds the reveal until its glow ends, and `holdingReveal` stops polling from jumping ahead.
- **The reveal:** `src/screens/DuelReveal.tsx` runs the stages `waiting`, `first`, `second` and `done`, with my card first. It scrolls itself into view, and remembers on this device that it played. With reduced motion, or on a later visit, it starts at `done`.
- **The cards:** the panel's `.choice-button` and the reveal's `.duel-card-front` share their tone rules in `app.css`, so they can't drift apart.
- **Tests:** rules and payouts are in `tests/sql/games.sql`. `tests/hosted/games.test.ts` covers what needs the real API. `tests/e2e/games.spec.ts` covers the screens, and `tests/unit/games.test.ts` the tap queue and the maths.

## Deviations from the design

- **Tests use demo players:** the admin can't invite test accounts, so rules and payouts moved from hosted tests to a rolled-back SQL file, as forced participation did in slice 003. Hosted duels and the smoke duel use `demo-nuria` and `demo-pau`. The human saw this in the handover, not before it was built.
- **Locks:** `lock_in()`, `answer_invitation()` and `cancel_event()` lock the event before claiming the request, because a tap that claimed first would deadlock with the reveal paying that player. `complete_event()` refuses a game before claiming anything. `create_game_event()` locks its players first, like `spin()`.
- **REQ-203 replaced by REQ-210, in review:** see Review outcome.
- **Side-by-side cards, in review:** the design kept the buttons well apart so a stray tap couldn't pick the wrong one. The human chose the results layout, knowing that.
- **The reveal scrolls into view:** not in the design. The first version played off-screen, which no test caught. See Tooling lessons.
- **Added without being asked:**
  - The description is copied with the settings, because REQ-149 wouldn't hold otherwise.
  - The reveal plays once per device, using browser storage, so someone who wasn't watching still gets it.
  - The winner gets roulette's celebration. It's skipped if they lost or weren't playing.
  - The list shows a game's name instead of a pot, as a duel has none.
  - `lock_in()` returns `saved`, to tell a late tap from a saved one.
- **Helpers the design didn't list:** `private.cancel_open_event()`, `private.duel_reveal()`, `private.valid_duel_settings()`, and `src/screens/EventActions.tsx`, which holds what classic and game screens share. `private.resolve_game()` was an empty function for one migration, so T4 could land before T5.
- **Added at review:** owner-level rules in `tests/sql/constraints.sql`, and `npm run demo -- pick`.
- **Existing tests changed:** the size checks in `admin`, `events` and `layout` specs now round, because a link measured 43.99999px mid-animation.
- **Test first:** T1 to T4, T6, T8, T10 and R1.1 to R1.3 failed before they passed, though T1, T2 and T4 only showed that the function didn't exist. T5's SQL tests weren't run before their migration. T9's unit tests failed first, but its browser tests stopped at the strict build. T11's failing run printed no summary, so it proves nothing. T7's tests only ran after the migration.
- **Full suite per task:** after each task I ran that task's tests, and sometimes the unit tests. The full suites ran at the end of each round.
- **SQL runs:** during the build I ran `games.sql` in sections, and in full once at the end, which found a line missing from the saved file. It wasn't rerun after that, as nothing changed.
- **Migrations:** all 8 applied the first time, apart from one syntax error of mine in `create_game_event`. `games` contains a `drop constraint`, and I can't tell whether anyone was asked.
- **A bad commit:** one commit landed with broken quoting in `text.ts`, because the hook runs before the command, and my `sed` was in the same command. The next commit fixes it.

## Review outcome

Two rounds, then approved with no notes.

- **Round 1:** the human asked for a glow of 0.7 seconds instead of 2, on the outer border only, and for the selection cards to look like the result cards. The glow's length contradicted REQ-203 and two acceptance criteria, so the human was asked, and chose to amend the slice. REQ-210 replaced REQ-203. They also chose side by side over stacked.
- **Round 2:** approved.

`slice-auditor` failed `review.md` in round 1 on its wording, not the slice, and passed round 2. Round 1's main catch was that plain `npm` is blocked by this computer's PowerShell policy, so the steps moved to `npm.cmd`. Round 2's was that step 7 didn't explain a `+20` where 30 was expected. Both rounds claimed `AGENTS.md` lacked `pick`, which was wrong. No second audit ran after either round's edits, though a script reran round 1's steps. The human's approval doesn't say what they tried, so nothing here records a test on a real iPhone.

During round 1 the live **Qui traeix (%)** changed to 300, and it was back at 250 by the close. Neither change was mine. That exposed three tests that assumed the defaults.

Results at the last handover: 114 unit tests, 243 Chromium browser tests, 179 hosted tests, and 470 in GitHub Actions, 235 per engine, with 16 skipped that need the real project. WebKit is still blocked on the human's machine. In round 1: all 80 checks in `games.sql`, all 18 rules in `constraints.sql`, and `events.sql`, with 61,812 splits. No SQL file ran in round 2, as there was no migration, and `roulette.sql` didn't run at all, as nothing touched it.

All 14 deliberate breaks of the screens were caught in the end. The SQL wasn't broken on purpose, as it's the live database.

Two failures weren't explained. One game test failed once, in the run right after a deliberate break, and didn't return in 310 further runs. It may have reused that break's server. A real-project login failed once and passed on rerun, like the stall in slices 003 and 004.

## Gotchas

- **`lock_in()` must never write to a public table before the reveal.** REQ-194 depends on it, and so does polling. The same goes for `game_state()` reading `private.choices`.
- **Lock the event before claiming** in any function that can meet a game. Claiming takes a shared lock on the caller's row, and the reveal pays players while holding the event. `admin_adjust`, `create_event` and `complete_event` on a classic event still claim first.
- **`then` inside an `if` condition ends it.** PL/pgSQL stops at the first `then`, so a `case` there needs brackets. The error is a baffling "syntax error at end of input".
- **Slice 007 has more to change than `resolve_game()`:** the player count in `create_game_event()`, the choice check and the upsert in `lock_in()` (REQ-205 refuses a change), `set_game_settings()`, and `game_state()`, which must show who has locked in for La minoria only (REQ-197) and stay silent for duels.
- **Slice 006 can publish `events`,** because a lock-in changes no public row, but never anything in `private`. A hosted test listens for this.
- **Hosted game tests and the smoke duel need two demo players.** They'll fail once the wipe removes them, so slice 008 must decide what happens to these tests. `logInAsDemo()` sets a new password, which ends that player's session, so don't run them during a review.
- **The wipe in slice 008** must clear `private.choices`, which references events and profiles, and should leave `games` alone or put the defaults back.
- **Never assume the live settings.** The admin can change them, and that broke three tests here, as it did in slice 004. Read them from the duel's `settings`.
- **Game rules need changing in the migrations and in `tests/e2e/fake-supabase.ts`.**
- **`page.unroute()` with a URL also removes the fake's handler.** Use a flag and `route.fallback()`.
- **The glow is short.** A check that retries can miss it or wait it out. Mid-glow colours need a wait past the fade, because reading at once sees the old ones.
- **The cards' tones are shared with the reveal.** Changing `.duel-card-front[data-tone]` changes the panel too, which is on purpose.

## Follow-ups

- The **Pendent** status on a duel lags until the phase changes. Slice 006 covers live updates.
- REQ-208: partly done, as above. `admin_adjust` and `create_event` still claim first.
- REQ-207: `lockIn()` handles a lost connection, but other function calls still show the general error.
- Not tried on a real phone by Claude, including how the card flip runs on an older one. REQ-169 covers this.
- WebKit against the real project isn't tested anywhere while Windows blocks it locally, because CI has no login.
- Each hosted run adds about 20 duels to the demo accounts' history until the wipe, and the audits and rehearsals left more.
- Find out why Chromium stalls at login, carried over from slice 003.

## Tooling lessons

- **Looking at screenshots found the worst bug:** the reveal played off-screen, and 300 tests passed. The review skill already asks for this, and it paid off.
- **Retrying checks hid gaps three times:** one waited out a glow, one an animation, and one read colours before a fade. This is the same lesson as slice 004, so it was proposed again.
- **Deliberate breaks need care:** 3 of the first 12 failed at the build, and 1 changed nothing. `compiled=` in the script's output showed this, as it did in slice 004.
- **A rehearsal can pollute a step:** "Duel1 has 3 rows" stopped being true once I'd run it, so steps should hold however often they're run.
- **The hook tests the tree before the command:** a failing test on disk blocks an unrelated commit, and an edit in the same command as the commit isn't tested at all.
- **My own slips:** Git Bash heredocs with apostrophes failed, as `AGENTS.md` warns. A chained command was blocked whole by the hook, so its edits didn't run.
- **Proposed to the human, nothing added:** a line in `AGENTS.md` that review commands use `npm.cmd`, and one on retrying checks for things that expire.
