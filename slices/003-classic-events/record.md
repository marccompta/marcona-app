# Slice 003 record

Written after human approval. Once the slice closes, this file is frozen.

- **Closed:** 2026-11-07
- **Commits:** `git log --grep "Slice: 003"`
- **Requirements:** REQ-071 to REQ-100, REQ-186 to REQ-190

## What shipped

Anyone can create a classic event, invite friends and collect buy-ins. The creator can pay out the winners or cancel, and every marcona is accounted for.

- The Esdeveniments list, the new event form and the event screen.
- `events` and `event_participants`, with a trigger that freezes finished events.
- `create_event()`, `answer_invitation()`, `cancel_event()` and `complete_event()`, and the payout maths in `private.split_pot()`.
- Forced participation, which only the admin can use.
- `remove_profile()`: removal declines pending invitations, and it's blocked while the person has accepted an open event.
- Buy-ins, refunds and payouts in the audit, each opening its event, with forced buy-ins showing who made them.
- A phone-sized smoke test on the real project, and `npm run demo`, which plays the demo accounts during a review.

## Why

Classic events are the core of the night, and the last must-have before the site is useful. They move money between people, so they follow [ADR 0004](../../docs/adr/0004-money-in-postgres-functions.md): one Postgres function per action, one transaction, and a client request ID. No new ADR was needed.

## How it works

- **Each action:** the function checks the caller and the input, claims the request ID with `private.claim_request()`, locks the event row, moves money through `private.apply_movement()`, and stores its result with `private.finish_request()`. A refusal rolls the claim back.
- **Lock order:** the event, then users by ID, then participant rows. `remove_profile()` takes the user and then the participant row, which is why accepting charges before it updates the row.
- **Creating an event:** `create_event()` locks the creator and every invitee first, so nobody can be removed or spend their marcones before it commits. With `p_force`, it checks every balance before writing anything, and raises `forced_insufficient_balance` with the usernames in the exception's detail. `errorMessage()` words that in Catalan.
- **Payouts:** with 2 people, `p_first` takes the whole pot and percentages don't apply. With 3 or more, `split_pot()` rounds each share down and gives the remainder to the first paid place. `events.results` keeps every paid place, including one that rounded down to 0, which gets no ledger row.
- **Forced buy-ins:** nothing marks them. A buy-in whose actor isn't its user can only be forced, and `forcedBy()` in `src/screens/Movements.tsx` reads it that way.
- **Who sees what:** event policies read through `profiles`, as the ledger's does. A creator can only invite accounts of their own kind, so test events never mix with real ones.
- **Removal:** `admin-users` calls `remove_profile()`, which locks the user's row, so an acceptance lands either before it, which blocks the removal, or after it, which fails.
- **Screens:** `src/lib/events.ts` holds the reads and calls, `src/screens/Events.tsx`, `NewEvent.tsx` and `EventDetail.tsx` the screens, and `src/shell/Form.tsx` the form helpers they share with the admin screen.
- **Tests:** `tests/hosted/events.test.ts` covers the rules on the real project, including concurrency. `tests/sql/events.sql` covers the payout maths and forced participation, and rolls back. `tests/e2e/smoke.spec.ts` is the REQ-100 smoke test.

## Deviations from the design

- **`public.remove_profile()`, added:** removal moved into Postgres, so an acceptance can't slip in between the check and the removal.
- **A trigger freezes finished events, added:** so REQ-083 holds for the database owner too.
- **Lock order, extended:** the design said the event, then users. Accepting first updated the participant row and then charged, which would have deadlocked against a removal. I caught it reading the code before applying the migration, so no test has ever seen that deadlock.
- **Test accounts:** the real admin can't invite them, so forced participation is tested in `tests/sql/events.sql`, in a transaction that plays the admin and rolls back. Topping up the admin for hosted tests would have put test rows in the real audit. The review script covers the real path.
- **`fetchMovements()`, fixed from slice 002:** paging by position could show a row twice if a movement landed mid-read, past 1,000 movements. The new event tests exposed it. It now pages by ID.
- **Selects on Safari's engine, fixed from slice 002:** the audit filter's text was unreadable in WebKit, and this slice uses the same control for winners. A screenshot showed it, not a test. A test now covers it.
- **Form helpers moved:** `useAction()`, `Outcome`, `Field` and `plainInput` went from `Admin.tsx` to `src/shell/Form.tsx`.
- **`tsx`, added:** a dev dependency, to run the demo script.
- **Demo script, extended:** it can also invite the admin, so one phone can see an invitation. `fund` cancels every open event and sets exact balances, so a review's numbers repeat.
- **Test first:** T6 and T8 had no true failing run, because the strict build fails first. Breaking 25 behaviours in the screens on purpose stood in for that, and all 25 were caught, after a test was added for the one that first survived. T1 to T5 and T7 failed first, but because the function didn't exist, not on each behaviour. I didn't break the SQL on purpose, as it's the live database.
- **Full suite per task:** after each task I ran the unit tests and that task's hosted and browser tests, not everything. The full suite ran at the end, because each hosted run adds accounts and counts against the Auth limit.
- **Migrations:** `events` and `forced_participation` contain `drop` statements, and both applied the first time. I can't tell whether anyone was asked. `admin-users` was deployed as version 3 and `execute_sql` ran with no error, and I can't tell whether a prompt appeared for those either.
- **The "Casino Tokens" artifact** couldn't be read during the build, as the artifact tools were unavailable. The screens follow the spec, the design and the existing look, and weren't compared with it again.

## Review outcome

One round. The human approved with no notes.

Before the handover, a script ran all 21 review steps on the deployed site, in WebKit at iPhone 14 size. `slice-auditor` then followed them and every step matched, but it failed the review on one problem: restarting partway left old events open, so a later `accept` could charge someone twice. `fund` now cancels open events first, and a stop and restart gave clean numbers. Its smaller notes were fixed too. No second audit ran, and the script wasn't run again after that last change.

Results at the handover: 86 unit tests, 116 hosted tests, 232 browser tests on each of the last 3 local runs and once against the deployed site, all 13 owner-level rules rejected, and all 10 event checks passed across 61,812 payout splits. The auditor didn't rerun the hosted or browser suites, the SQL files or the deliberate breaks.

**Two of about ten full browser runs failed, and the cause is unknown.** Both were followed by clean runs with no code change.

- **Chromium stuck on "Entrant…":** the real-project login tests timed out after 5 seconds. Supabase's logs show the requests didn't arrive in time, or at all, so it isn't Auth or a rate limit. WebKit never did this, in the same runs. It looks like the failure slice 002 recorded. It didn't reproduce with traces on. The smoke test now waits 20 seconds at login, and `tests/e2e/hosted.spec.ts` still waits 5.
- **The new event form's size check** failed once, in both browsers, in the same run as the second stall, on the back link. It has passed every time since.

## Gotchas

- **Keep the lock order: the event, then users by ID, then participant rows.** A new function that updates a participant row before charging can deadlock against a removal.
- **`private.apply_movement()` refuses removed users, and `cancel_event()` relies on REQ-096 to never meet one.** REQ-184 in slice 005 cancels a duel when a player is removed, so it has to refund before `remove_profile()` sets `removed_at`, or change the order.
- **`create_event()` is built for classic events.** Slices 005 and 007 need `events.type` widened, the `payout_*` columns may need to allow null, and changing its arguments means dropping the function, then updating `tests/hosted/public-functions.ts`.
- **New event rules need changing twice:** in the migrations, and in `tests/e2e/fake-supabase.ts`, which copies them by hand. The fake can't prove the Supabase query shape, so `tests/hosted/events.test.ts` checks what the screens read.
- **The wipe in slice 008 has more to get past:** `event_participants` and `ledger` reference `events`, with no cascade. The freezing trigger covers updates only, so deletes get through it.
- **Never run `npm run demo -- fund` once real data exists.** It cancels every open event the admin can see, and sets the admin's balance.
- **Hosted tests share four logged-in players.** Each test makes its own events and checks changes, not exact balances, unless it empties the account first.
- **A creator holding a stale two-player form** gets `invalid_winners` if a third person accepts. Nothing is paid, and a reload fixes it, until live refresh arrives.
- **`tests/sql/events.sql` needs a real admin row.** It plays them through `request.jwt.claims`, and rolls back.

## Follow-ups

- Live refresh of the events screens, in slice 006 (REQ-152).
- Find out why Chromium stalled at login, and whether it's only this machine. The rehearsal in slice 008 (REQ-169) is the real check.
- Not tried on a real iPhone or Android by Claude, including the native pickers. REQ-169 covers this too.
- The events list reads the newest 1,000 events, far above a single night.
- Compare the event screens with the "Casino Tokens" artifact, if the human wants that.
- Each `npm run test:hosted` adds about 40 hidden accounts, until the wipe.
- The human was told the admin's password appeared in session output. Changing it is their call, and it's changed after the final wipe anyway.

## Tooling lessons

- **A blocked commit took a step with it:** the hook stopped a chained command, so the `sed` that ticked T1 never ran, and nothing noticed until the auditor did. Reading the hook's docstring would have warned me that it runs before the whole command, and that a file left on disk counts.
- **Long runs hide flakes:** a test that changed the fake's state before the page had loaded passed in Chromium and failed only in WebKit.
- **Looking at screenshots found what tests couldn't:** the unreadable select had passed everything. It's now tested, but the habit found it.
- **Breaking behaviours on purpose worked again,** and found a real gap: nothing proved the event screen kept its request ID on a retry. Three of the first mutations didn't compile, so they proved nothing until rewritten.
- **A password reached session output** through Playwright's `error-context.md`, which records what was typed. Saved as a note for future sessions.
- **Proposed to the human, nothing added:** a check in `check_docs.py` that every task is ticked before a slice goes to `in-review`, and a step in `/slice-review` to look at each screenshot.
