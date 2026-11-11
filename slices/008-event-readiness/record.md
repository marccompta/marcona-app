# Slice 008 record

Written after human approval. Once the slice closes, this file is frozen.

- **Closed:** 2026-11-11
- **Commits:** `git log --grep "Slice: 008"`
- **Requirements:** REQ-164 to REQ-174, REQ-219 to REQ-222

## What shipped

- **Dades,** at the bottom of **Administració**, for the admin only, with three panels:
  - **Export:** **Prepara l'exportació** reads everything, then offers two downloads: every user, event (with its participants) and movement as JSON, and the movements as a CSV for a spreadsheet. Secret choices are never in them.
  - **Wipe:** **Esborra les dades de prova** deletes every account but the admin's, every event, choice, request record and movement, and sets the admin to 0 marcones. Its button stays dimmed until `ESBORRA` is typed exactly, and the server checks the word again. Only a tap on the button wipes, never the keyboard's Enter key.
  - **Lock:** **Bloqueig per a l'esdeveniment** asks once, then closes the wipe for good. After that, the panel shows only that it's locked.
- **Ruleta's board of last results,** under the bet: the player's own last 10 spins, newest on the left with a gold ring, as red, black or ivory circles, with faint outlines for places not yet filled. It has no visible title, so it fits a phone without scrolling, and screen readers call it **Últimes tirades**.
- **The bet drop:** when a spin that went through lowers **Aposta màxima** below the whole-number bet typed, **Aposta** shows the new maximum.
- **Two documents:** `docs/rehearsal-checklist.md`, every money flow to try on real phones, and `docs/day-of-guide.md`, the dates, the 10 steps before the event in order, the awake check, the freeze, the emergencies and what to do afterwards.
- **The read-only switch** for the Supabase MCP server was tried, and the guide says how to use it.

## Why

The free plan has no backups, the hosted project held about 1,230 test accounts and 12,700 test movements, and the human needed a plan for the night of 13 November. The export is a record, not a backup system. The wipe is the one guarded exception to the append-only ledger that [ADR 0004](../../docs/adr/0004-money-in-postgres-functions.md) foresaw, and the lock removes even that once the real data is in. No new ADR.

**One database function, not an Edge Function,** for the wipe. The design assumed deleting Auth users needed the secret key, but the database owner can delete from `auth.users` directly, and profiles go with them. Everything then happens in one transaction or not at all.

**The board reads the ledger,** not the phone's storage, which the human had allowed. A player can already read their own movements, so nothing in Supabase changed, and the board is the same on every phone.

The board and the bet drop were added by the human before the verdict, as part of this slice, front end only.

## How it works

- **Migrations:**
  - `admin_export` adds `public.admin_export()`, admin only, returning `{exported_at, users, events, ledger}`. It never reads `private.choices`.
  - `admin_wipe` makes `private.reject_ledger_change()` allow a delete only while the transaction-local setting `marcona.wiping` is `on`, and adds `public.admin_wipe(p_confirmation)`.
  - `wipe_lock` adds the `wipe` row to `app_settings`, `private.wipe_locked()`, `public.wipe_state()` and `public.lock_wipe()`, and makes `admin_wipe()` refuse with `wipe_locked` before it checks the word.
- **The wipe** checks the admin, the lock and the exact word, locks the tables in exclusive mode, sets the flag, deletes choices, request records, the ledger, participants and events, sets the admin's balance to 0, deletes every other Auth user, clears the flag, and returns the counts. In the SQL test it took about 0.9 seconds with all the test data.
- **Screens:** `src/screens/DataPanel.tsx`, with `src/lib/readiness.ts` for the calls, the CSV and the file names. The CSV starts with a byte order mark so accents survive, and a text cell that a spreadsheet would run as a formula is escaped. Downloads are blob links, so each starts from a tap, which phones require.
- **The board:** `fetchRecentResults()`, `addToBoard()` and `boardPlaces()` in `src/lib/roulette.ts`. Results are keyed by movement ID, so a spin made while the first read is on its way is merged, not lost or repeated. A new result joins once the wheel has stopped, like the result and the balance.
- **The bet drop:** `fitBet()` in `src/lib/roulette.ts`. After each spin, Ruleta reads `roulette_state()` again, and lowers the bet only if that spin went through and no newer attempt is waiting for a retry.
- **Tests:** `tests/sql/readiness.sql` (16 entries, run through `execute_sql`, always rolling back), `tests/e2e/readiness.spec.ts`, the board and bet sections of `tests/e2e/roulette.spec.ts`, `tests/unit/export.test.ts`, `tests/unit/roulette.test.ts`, `tests/hosted/readiness.test.ts` and the board's tests in `tests/hosted/roulette.test.ts`. The fake in `tests/e2e/fake-supabase.ts` has the new functions.

## Deviations from the design

- **No Edge Function** for the wipe, as above. `supabase/functions/admin-wipe/` was never made.
- **`.mcp.json` is unchanged:** read-only was tried by adding `&read_only=true` and restarting, then removed. The tools for migrations, deploys and branches disappeared, and SQL ran as `supabase_read_only_user` in a read-only transaction.
- **The wipe panel isn't a form,** because the first audit found the phone keyboard's Go key wiped at once.
- **`service_role` can't call the export or the wipe,** only the signed-in admin can.
- **Added before the verdict, at the human's request:** the board (REQ-219 to REQ-221), its title removed after the human found it pushed the circles below the fold, and the bet drop (REQ-222).
- **REQ-169, REQ-171, REQ-173 and REQ-174 are still to happen:** the rehearsal on real phones, the awake check, and the freeze with read-only on, from 12 November. The slice delivers the steps. They stay `planned` in the backlog until the human does them.

## Review outcome

One round, approved with no notes, on 11 November.

Three `slice-auditor` runs:
- **The first,** of the data panels, failed on the Enter key wipe, fixed with a test. It also found the panels ran together.
- **The second,** of the board, passed, with four wording fixes.
- **The third,** of the bet drop, failed on wording: the steps said to spin again after a win without retyping, so a later loss lowered the maximum but not below the bet, which would look like a bug. It also found a real race: a spin tapped in the 65 ms before the new maximum arrived, then refused, had its bet changed afterwards. Both fixed, the race with a test that failed on the old code. Neither fix was re-audited.

Results at the handover:
- Unit tests: 147 passed.
- Browser tests: the last full run had 604 passed, 1 failed (REQ-215, which fails on `main` too) and 1 skipped. After the bet drop, the Ruleta file ran alone: 142 passed in both engines.
- Hosted tests: two files hit the Auth rate limit, then passed on rerun.
- `readiness.sql`: 16 passed. `constraints.sql`: all 19 rejected.

The verdict didn't say whether the rehearsal on real phones had been done.

## Gotchas

- **The wipe ends the hosted tests, the real-project browser tests and `npm run demo`** for good, because the demo players and test accounts go, and `.env.test.local` is deleted afterwards. During the freeze, fixes rely on the fake, the unit tests and the SQL tests.
- **Anything that deletes from the ledger must go through `admin_wipe()`.** The trigger only lets a delete through while `marcona.wiping` is `on` in that transaction, and only the owner's functions can set it.
- **A new table with user data must be added to the wipe and to the export,** in the right order: `private.choices` before events and profiles, which it references.
- **Only the database owner can undo the lock,** with SQL, by setting `app_settings` `wipe` back to `{"locked": false}`. That's on purpose.
- **`wipe_state()` is `stable`:** within one SQL statement it sees the snapshot from the statement's start, so SQL tests read it in separate statements.
- **A retry keeps its bet and request ID** (REQ-102). Anything that changes the bet must leave a pending retry alone, as `fitBet()`'s caller does.
- **The export can time out** at the database's 8-second limit with a lot of data, as it once did with all the test data while the project was busy (REQ-218).

## Follow-ups

- REQ-169, REQ-171, REQ-173 and REQ-174: the human's steps, in the [day-of guide](../../docs/day-of-guide.md).
- REQ-215: the WebKit slow-connection duel test.
- REQ-217: the WebKit resting-screen duel test, which fails on `main` too.
- REQ-218: an export that stays under the 8-second limit however much data there is.

## Tooling lessons

- **A deliberate break hit two lines,** because a `sed` matched a second CSS rule. It was caught by checking `git diff` before undoing. No rule added: AGENTS.md already says to undo a break with an edit, and checking the diff covers this.
- **Rate limits in hosted tests:** running the hosted suite right after the browser suite hit the Auth rate limit twice. The board's hosted test was rewritten to need no second login. Proposed: a note in AGENTS.md to leave a few minutes between the two suites. Not added unless the human agrees.
- **Audits found what the tests didn't,** twice: the Enter key wipe and the 65 ms race. Both came from following the steps on the deployed site as a person would, which keeps the audit worth running for every addition.
