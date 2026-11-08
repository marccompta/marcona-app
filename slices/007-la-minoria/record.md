# Slice 007 record

Written after human approval. Once the slice closes, this file is frozen.

- **Closed:** 2026-11-08
- **Commits:** `git log --grep "Slice: 007"`
- **Requirements:** REQ-155 to REQ-158, REQ-160 to REQ-163, REQ-185, REQ-192, REQ-193, REQ-197, REQ-205

## What shipped

- **La minoria,** a group game for 3 or more, for the admin to create, playing or not. The creator starts it with **Comença el joc** once at least 3 have paid, and pending invitations lapse unpaid. Forced participation charges everyone and starts it at once.
- **Picking:** each player picks one of two options in a private panel and confirms it. A confirmed choice is final, and the panel then only shows it. Everyone sees who has locked in, never what.
- **The result:** the moment the last person picks, the smaller side splits the whole pot, rounded down, and the remainder goes to whoever on that side locked in first. A tie or a unanimous choice refunds everyone. The reveal shows each side's count, the verdict, every choice and payout, and who got the remainder.
- **Settings:** **Administració** has a form per game. La minoria's has the on switch, the description and the two option names, Blanc and Negre by default.
- **The smoke test** plays a real La minoria with the admin and both demo players.
- `npm run demo -- pick` now plays La minoria too, by either option's name or its key.

## Why

Duels only involve two people, and La minoria gives the whole group a game to play at once, on slice 005's engine. [ADR 0005](../../docs/adr/0005-server-decided-admin-run-games.md) applies: the server decides everything, and secret choices stay in `private.choices`. [ADR 0004](../../docs/adr/0004-money-in-postgres-functions.md) applies to the payouts and refunds. No new ADR.

**A start step, not a last answer,** because nobody knows how many will accept. The creator decides when to stop waiting, and anyone still pending simply misses it.

**Choices are stored as keys, `a` and `b`,** and the names are settings copied onto each event. Renaming the options can then never change a stored choice, and running games keep their own names.

**A confirmation step,** unlike a duel's single tap, because a La minoria choice can't be changed.

## How it works

- **Migrations:**
  - `minoria_game` seeds the game, turned off, and updates `create_game_event()` (at least 3 players, counting the admin only if they play, and refused when too few are invited to ever reach 3), `answer_invitation()` and `remove_profile()` (a decline or removal is only a decline).
  - `start_game` adds `start_game()`. It locks the event before claiming the request, like `answer_invitation()`.
  - `minoria_resolution` adds `private.minoria_reveal()` and La minoria's branch in `private.resolve_game()`, and makes `lock_in()` accept `a` and `b` and refuse a second choice with `choice_locked`. Refunds are `event_refund` movements, and payouts name the creator.
  - `minoria_state` makes `game_state()` list who has locked in, for La minoria only, by user ID, and adds `my_choice()`.
  - `minoria_settings` adds `private.valid_minoria_settings()` and La minoria's branch in `set_game_settings()`, and turns the game on.
- **The remainder** goes by `private.choices.lock_order`, a generated identity, so there are no ties between lock-ins.
- **Screens:** `EventDetail` routes La minoria to `src/screens/MinoriaEvent.tsx`, which holds the start panel, the choice panel and the people, and to `MinoriaReveal.tsx` once revealed. It reuses the duel's `useGamePolling()`, now exported with an `onState` callback for the lock-ins, and the duel reveal's play-once memory. `People` in `EventActions.tsx` takes `lockedIn`, to show **Triant** or **Ha triat**. `GameSettings.tsx` has a shared `GameForm` with a `DuelForm` and a `MinoriaForm`.
- **Tests:**
  - `tests/sql/minoria.sql`, 66 entries, covers the rules, payouts, remainders, ties, refunds, the start, the secrecy and the option names, as the real admin.
  - `tests/e2e/minoria.spec.ts` covers the screens against the fake. `tests/e2e/fake-supabase.ts` holds a second copy of the rules.
  - `tests/unit/games.test.ts` checks the seed's Blanc and Negre and that the last migration turns the game on, since the live names can be renamed.
  - The smoke test plays La minoria on the real project, and `tests/e2e/demo-players.ts` makes tests that log in demo players take turns.

## Deviations from the design

- **Seeded off, then turned on** by the slice's last migration, so the live site from `main` wouldn't offer a game it couldn't play while the slice was built. It's on from merging, and briefly before it, as the review noted.
- **A confirmation step** in the choice panel, which the design didn't mention, because a choice is final.
- **Option names** must be 1 to 20 characters, trimmed, and differ even ignoring case. The spec didn't set a rule. The field stops at 20 characters.
- **No worked example** in La minoria's settings form, unlike the duel's. The design listed one among slice 005's notes, but La minoria has no numbers to show.
- **The seed's names are checked in a unit test,** not in `tests/sql/minoria.sql`, which can't assume the live names now the admin can rename them.
- **Demo players take turns** through a lock in `tests/e2e/demo-players.ts`. A login resets a demo player's password and ends their other sessions, and there are only two, which La minoria needs together.
- **The session building this slice was interrupted** after T4. The resumed session checked the branch, the commits and the hosted migrations, found nothing half-done, and carried on with T5. Whether T1 to T4's tests failed before their code wasn't recorded. T5's SQL tests failed first with `game_not_found`, and its browser tests failed first because the form didn't exist. Two deliberate breaks of the form, each checked to compile, were both caught.
- **Added at review:** `npm run demo -- pick` takes La minoria's names. `AGENTS.md` lists `tests/sql/minoria.sql` and the new `pick`.

## Review outcome

One round, approved with no notes.

`slice-auditor` passed `review.md` in round 1, with every step matching on the deployed site. Its main catch was that no step showed a *running* game keeping its names after a rename, as the spec asks, so the steps now rename while a game is open. It also found unclear wording, missing waits, and three screenshots that didn't show what their step cited. All were fixed, and a script reran every step as written. No second audit ran. Nothing has been tried on a real phone.

Results at the handover:
- 126 unit tests and 182 hosted tests passed.
- Browser tests: 560 passed, 3 failed, all older WebKit duel tests. 2 passed on rerun. The slow-connection tap test fails in about half of WebKit runs on `main` too, and became REQ-215.
- Smoke tests: La minoria and the duel passed on both engines. The audit checks in the Realtime and roulette tests failed in full runs, and became REQ-214.
- `minoria.sql` and `games.sql` passed in full, and all 19 rules in `constraints.sql` were rejected.

**REQ-214's cause was found while closing:** react-router's `<Link>` searches the whole page for a `<base>` element each time it renders. The audit re-renders every row on each live reload, so a test account's 9,000 rows blocked the page for about 4.5 seconds per reload. `useLoad()` also discards a load in flight when another reload comes, so under steady changes no load finished. It's being fixed outside this slice.

## Gotchas

- **Game rules live three times:** the migrations, `tests/e2e/fake-supabase.ts`, and for La minoria's names, `GameSettings.tsx`'s 20-character limit.
- **A choice is `a` or `b`, never a name.** Anything that shows a choice must go through `optionLabel()` with the event's own settings, not the game's current ones.
- **`game_state()` must stay silent about lock-ins for a duel** (REQ-194). Only La minoria gets `locked_in`.
- **`lock_in()` must lock the event before claiming the request,** as `start_game()` does, or a reveal that pays players can deadlock with it.
- **Tests can't assume the live names or settings.** A review rehearsal that stopped partway left the names renamed, and the next game rightly used them. Read them from the event's `settings` or from `games`.
- **In SQL tests, don't call a function that writes inside a `WHERE` clause.** It runs once per row scanned, creating many events, as `minoria.sql` did once before it was fixed.
- **A test driving another client must first see the server's state on the screen.** The smoke test once locked in before the start had reached the server, and was refused with `game_not_choosing`.
- **Slice 008's wipe** removes the demo players, which the La minoria smoke test needs as well as the duel tests.

## Follow-ups

- REQ-214: the audit and other live screens starving under steady changes. Its cause is above, and it's being fixed outside this slice.
- REQ-215: the WebKit slow-connection duel test, which sends the first tap twice in about half of runs, on `main` as well.
- Slice 008 should account for the new smoke test when it plans the wipe.

## Tooling lessons

- **Resuming an interrupted build** worked from git and the Supabase migration list: the branch, a clean tree, ticked tasks matching commits, and applied migrations matching the files. A "resume" checklist in `/slice-build` would make that routine. Proposed to the human at close, and not added unless they agree.
- **Review rehearsal scripts must reset in a `finally`.** One stopped partway and left live settings changed. The review's setup now checks the names. No rule added, as AGENTS.md already says never to assume live settings.
- No other skill, rule or hook was added.
