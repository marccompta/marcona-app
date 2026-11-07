# Slice 003 review

## 1. What to look at

MarcOna now has classic events. Anyone can create one, invite friends and collect buy-ins, and the creator can then pay out the winners or cancel. Every marcona is accounted for in the audit.

As the admin you also get forced participation: every invitee joins and pays at once, without having to accept. Removal has two new rules. It declines pending invitations, and it's blocked while the person has accepted an open event.

This should take about 10 minutes. You'll use your phone as the admin, and a terminal on your computer to play the demo players' side. What was agreed is in [spec.md](spec.md), and the work is in [tasks.md](tasks.md).

## 2. Before you start

- **You need:** your phone, your admin username and password from `docs/setup.md`, step 7, and a terminal at the repo root on this computer, with `npm install` already run and `.env.test.local` in place. The password stays with you, and it isn't in this file.
- **Setup:** Run this once. It cancels any open event, then sets you and the three demo players to exactly 100 marcones. Every number below depends on it.

  ```
  npm run demo -- fund 100
  ```

  It prints your username and `demo-laia`, `demo-nuria` and `demo-pau`, each with `100`, after a `cancelled` line for any event it closed. If you stop partway and want to start again, run it again, and start from step 1.
- **What's already there:** **Passats** and the audit hold the same event names from when these steps were rehearsed. Go by the newest row, which is always at the top of its group.
- **Reset afterwards:** Nothing to clean up. Every event in these steps ends completed or cancelled, and the wipe in slice 008 deletes all of it. If you stop partway, the next `fund` closes what's left.
- **Demo passwords:** each `npm run demo` command that plays a demo player sets a new random password for them, so the ones you were given for slice 002 no longer work. You don't need them.
- **A reload is needed.** Screens don't update by themselves until slice 006. Where a step says reload, pull the page down or tap away and back.

## 3. How to review

Open https://marccompta.github.io/marcona-app/. This slice's branch is what's deployed there, so `main` isn't live until the slice closes.

**Being invited (phone and terminal):**

1. Log in and tap **Esdeveniments**. You should see the gold **Nou esdeveniment** button, then **Invitacions**, **Oberts** and **Passats**. If you see "Aquesta pantalla arribarà aviat.", the new version isn't live.
2. In the terminal, run these two commands. Each prints a line such as `demo-laia invited marccompta to Bitlles`.

   ```
   npm run demo -- invite Bitlles 5
   npm run demo -- invite Truc 5
   ```

3. Tap **Classificació**, then **Esdeveniments** again. **Bitlles** and **Truc** are under **Invitacions**, each showing "Entrada 5 · Pot 5" and a gold **OBERT** pill, as in [list.png](evidence/screens/list.png).
4. Tap **Bitlles**. You should see a crown beside `demo-laia`, yourself as **Pendent**, and **Accepta** and **Rebutja**, as in [invited.png](evidence/screens/invited.png). Tap **Accepta**. You become **Hi participa**, the pot becomes 10 marcones, and the two buttons go.
5. Go back to the list, open **Truc**, and tap **Rebutja**. You should show as **Ha rebutjat**, and the pot stays at 5 marcones.

**Creating an event and paying it out:**

6. Go back to the list, and tap **Nou esdeveniment**. **1r**, **2n** and **3r** should start at 50, 30 and 20. **Convida** lists the three demo players and not you, and **Participació obligatòria**, further down, is off. [form.png](evidence/screens/form.png) shows the top of the form.
7. Enter **Nom** `Dards` and **Entrada** `7`, tick all three demo players, and change **3r** to `10`. Tap **Crea l'esdeveniment**. You should see "Els percentatges han de ser enters i sumar 100." and stay on the form.
8. Change **3r** back to `20`, and tap **Crea l'esdeveniment**. The event opens, as in [created.png](evidence/screens/created.png): entrada 7 marcones, pot 7 marcones, premis "1r 50% · 2n 30% · 3r 20%", a crown beside you, the three players **Pendent**, and "Calen almenys 2 persones per completar-lo."
9. In the terminal, run these. Each prints a line such as `demo-laia accepted Dards`.

   ```
   npm run demo -- accept Dards demo-laia
   npm run demo -- accept Dards demo-nuria
   ```

10. Reload the page. The pot is 21 marcones, `demo-laia` and `demo-nuria` are **Hi participa**, `demo-pau` is still **Pendent**, and **Completa** asks for **1r lloc (50%)**, **2n lloc (30%)** and **3r lloc (20%)**, as in [complete.png](evidence/screens/complete.png), which is scrolled down.
11. Pick `demo-laia` for both 1r and 2n, and `demo-nuria` for 3r. Tap **Completa i paga**. You should see "Tria una persona diferent per a cada lloc amb premi." and the event stays open.
12. Change 2n to yourself, and tap **Completa i paga**. The pill becomes **COMPLETAT**, and **Resultats** shows 1r `demo-laia` 11 marcones, 2n you 6 marcones and 3r `demo-nuria` 4 marcones, as in [results.png](evidence/screens/results.png), which is scrolled down, so a row is sliding under the header. 21 × 50% is 10.5, so the rounding gave the first place the spare marcona. `demo-pau` now shows **Invitació caducada**, and no buttons are left.
13. Tap **Classificació**. You should see `demo-pau` 100, `demo-nuria` 97, then `demo-laia` and you on 94. You tie, so the order is alphabetical.
14. Tap **Auditoria**. The newest rows are the three payouts, labelled **Premi · Dards**, as in [audit.png](evidence/screens/audit.png). Below them are the buy-ins, labelled **Entrada · Dards**. Tap a row, and **Dards** opens.

**Forcing participation:**

15. Tap **Esdeveniments**, then **Nou esdeveniment**. Enter **Nom** `Cartes` and **Entrada** `96`, tick all three demo players, and tick **Participació obligatòria**. Tap **Crea l'esdeveniment**. You should see "No tenen prou marcones: demo-laia." You're short too, but this message only names invitees, and a test covers a creator who can't pay. The balances in step 17 show that nobody was charged.
16. Change **Entrada** to `10`, and tap **Crea l'esdeveniment**. The event opens with everyone **Hi participa** and a pot of 40 marcones, as in [forced.png](evidence/screens/forced.png). Nobody had to accept.
17. Tap **Auditoria**. `demo-laia`, `demo-nuria` and `demo-pau` each have a -10 row labelled **Entrada obligatòria · Cartes**, with "Feta per" and your username under it, as in [forced-audit.png](evidence/screens/forced-audit.png). Your own row says **Entrada · Cartes**. **Saldo** shows 84 for `demo-laia`, 87 for `demo-nuria` and 90 for `demo-pau`: this one charge of 10 is all they paid.

**Removal and cancelling:**

18. Tap **Administració**, open `demo-pau`, and tap **Elimina l'usuari**. It asks you to confirm and says this can't be undone, but the removal will be refused, so tap **Sí, elimina**. You should see "Aquesta persona és dins un esdeveniment obert. Cal completar-lo o cancel·lar-lo abans." `demo-pau` stays in the list.
19. Tap **Esdeveniments**, and open **Cartes** under **Oberts**. Tap **Cancel·la l'esdeveniment**. You should see "Segur que vols cancel·lar-lo? Es tornaran totes les entrades.", and nothing has happened yet. Tap **Sí, cancel·la**. The pill becomes **CANCEL·LAT**, as in [cancelled.png](evidence/screens/cancelled.png).
20. Go back to the list, and open **Bitlles** under **Oberts**, which `demo-laia` created. You aren't its creator, so there's no **Completa**, but as the admin you can cancel it. Tap **Cancel·la l'esdeveniment**, then **Sí, cancel·la**. Do the same for **Truc**, also under **Oberts**.
21. Tap **Classificació**. You should see `demo-laia` 104, `demo-pau` 100, you 99 and `demo-nuria` 97. Tap **Auditoria**: the newest rows are refunds, labelled **Devolució de l'entrada** with the event's name, each with + and the buy-in. Tap one, and its event opens.

**How it looks:** compare the general look with [direction-b.png](../001-foundation/evidence/directions/direction-b.png). It shows only the ranking, so it has no pills or crown. Judge those from the screens: status tags are pills, and the crown is drawn in gold.

## 4. Checklist

Rows marked **test** are covered by the tests in section 5, and you don't need to do anything for them.

| # | Requirement | Check | Expected result |
|---|---|---|---|
| 1 | REQ-071, REQ-072, REQ-073 | Steps 6, 8, 13 | Starts at 50, 30, 20. The event is open, and you're in. The balance in step 13 shows the charge |
| 2 | REQ-074 | Step 7 | Catalan error, nothing created |
| 3 | REQ-075, REQ-076, REQ-077 | Test | A buy-in of 0 or 1.5, one above the balance, or no invitees, gets a Catalan error |
| 4 | REQ-078 | Step 6 | Demo players listed, not you, and no removed users |
| 5 | REQ-079 | Steps 4, 13 | Accepting makes you a participant. The balance in step 13 shows the charge |
| 6 | REQ-080 | Test | Without enough marcones, a Catalan error, and you stay invited |
| 7 | REQ-081 | Steps 5, 13 | Declined. The balance in step 13 shows no charge |
| 8 | REQ-082, REQ-094 | Step 12 | `demo-pau` shows **Invitació caducada**. Tests show a late answer is refused |
| 9 | REQ-083 | Step 12 | A finished event has no buttons. Tests try each action directly |
| 10 | REQ-084 | Step 19 | Cancelled, and step 21 shows the refunds |
| 11 | REQ-085 | Step 20 | You cancel `demo-laia`'s event |
| 12 | REQ-086, REQ-087 | Test | A participant can't cancel or withdraw, and nothing is refunded |
| 13 | REQ-088, REQ-089 | Steps 8, 20 | Alone, the creator can't complete. As the admin, you have no **Completa** on someone else's event, and tests show a direct call is refused |
| 14 | REQ-090, REQ-091 | Test | With 2 players, the creator picks the winner, who takes the pot. Step 10 shows a pot of 21 |
| 15 | REQ-092 | Step 11 | The same person twice is refused |
| 16 | REQ-093 | Step 12 | 11, 6 and 4. Tests cover the other rows, and 61,812 splits |
| 17 | REQ-095 | Test | A removed user's invitation shows as declined |
| 18 | REQ-096 | Step 18 | Catalan error, and they stay active |
| 19 | REQ-097 | Steps 1, 3 | Three groups |
| 20 | REQ-098 | Steps 4, 8 | Buy-in, pot, payout rule and participants, with a crown and a pill |
| 21 | REQ-099 | Steps 14, 21 | Buy-ins, payouts and refunds are in the audit, and open their event |
| 22 | REQ-100 | Test | The smoke test ran at phone size on the real project |
| 23 | REQ-186, REQ-187 | Step 15 | You see the option. A test shows a player doesn't, and a direct call is rejected |
| 24 | REQ-188 | Step 16 | Everyone is in at once. A test shows the admin can complete it |
| 25 | REQ-189 | Step 15 | Catalan error naming `demo-laia`, and nobody charged |
| 26 | REQ-190 | Step 17 | On the player's balance, made by you |

## 5. Already checked automatically

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test` | 86 passed |
| Type check and build | `npm run build` | Passed |
| Hosted tests, on the real project | `npm run test:hosted` | 116 passed |
| Browser tests, phone-sized, Chromium and WebKit, including the REQ-100 smoke test | `npm run test:e2e` | 232 passed on each of the last 3 runs, but see the note below |
| The same, against the deployed site | `E2E_BASE_URL=https://marccompta.github.io/marcona-app/ npm run test:e2e` | 232 passed |
| Rules only the owner can try | `tests/sql/constraints.sql` through `execute_sql` | All 13 entries "rejected", in [sql-checks.md](evidence/sql-checks.md) |
| Payout maths and forced participation | `tests/sql/events.sql` through `execute_sql` | All 10 checks "passed", 61,812 splits, in [sql-checks.md](evidence/sql-checks.md) |
| Security and performance advisors | Supabase MCP server | Nothing new to act on, in [sql-checks.md](evidence/sql-checks.md) |
| Docs | `python scripts/check_docs.py` | Passed |
| Tests can fail | 25 behaviours in the screens broken on purpose, one at a time | All 25 caught, after adding a test for the one that first survived |

**Intermittent failures, not explained.** Two of about ten full browser runs on this machine failed, and both were followed by clean runs with no code change:

- **Chromium stuck on "Entrant…":** the real-project login tests timed out after 5 seconds. Supabase's logs show the requests didn't arrive in time, or at all, so it isn't Auth or a rate limit. WebKit never did this, in the same runs. It looks like the failure slice 002 recorded. I couldn't reproduce it with traces on, so the cause is unknown. It hasn't been seen outside automated Chromium here, and the rehearsal on real phones in slice 008 (REQ-169) is the real check.
- **One form-size check failed once,** in both browsers, in the same run as the second stall, on the back link. It has passed every time since, and I don't know why.

The smoke test now waits 20 seconds at login, because it's testing the flows, not cold starts.

Instructions run as written: yes, all 21 steps, by Claude, on the deployed site in WebKit at iPhone 14 size, from `npm run demo -- fund 100`. It was a script following these steps, so a person hasn't tried them. Audit by `slice-auditor`: **FAIL on the first pass, for one problem.** It ran the setup and all 21 steps on the deployed site, in WebKit at iPhone size, and every step matched, but "run `fund` again to restart" didn't work. It left old events open, so a later `accept` could charge someone twice, and the balances wouldn't match. `fund` now cancels every open event first, and Claude confirmed a stop and restart gives clean numbers. Its smaller notes are fixed too: misplaced screenshots, gaps in the checklist, wording, and T1 left unticked in `tasks.md`. It didn't run the hosted or browser suites, the SQL files, or the deliberate breaks, so those figures are Claude's. No second audit ran.

## 6. Known limitations

- **Screens don't refresh by themselves.** A creator holding a two-player form while a third person accepts gets "Tria una persona diferent per a cada lloc amb premi." until they reload. Nothing is paid. Live refresh is in slice 006.
- **The real admin can't invite test accounts,** so forced participation runs for real only in this review. `tests/sql/events.sql` plays the admin in a transaction that rolls back.
- **The events list reads the newest 1,000 events.** A single night stays far below that.
- **Not tried on a real iPhone or Android by Claude.** Your review and the rehearsal in slice 008 (REQ-169) cover that.
- **Each `npm run test:hosted` adds about 40 hidden accounts,** until the wipe.

## 7. Your verdict

Type one of these in a Claude Code session started at the repo root:

- `/slice-verdict 003 approve`
- `/slice-verdict 003 changes <what to fix>`
- `/slice-verdict 003 reject <why>`

## Review log

### Round 1

Departures from the design, for `record.md`:

- **Added, not designed: `public.remove_profile()`.** Removal moved into Postgres, so an acceptance can't slip in between the check and the removal.
- **Added: a trigger that freezes finished events,** so REQ-083 holds for the database owner too.
- **Lock order extended:** the event, then users by ID, then participant rows. Accepting first updated the participant row and then charged, which would have deadlocked against a removal. I caught it reading the code before applying the migration.
- **Test accounts:** event policies read through `profiles`, and a creator can only invite accounts of their own kind. So the real admin can't invite test accounts, and forced participation is tested in `tests/sql/events.sql`, in a transaction that rolls back.
- **Fixed from slice 002: `fetchMovements()`.** Paging by position could show a row twice if a movement landed mid-read, past 1,000 movements. The new event tests exposed it. It now pages by ID.
- **Fixed from slice 002: selects on Safari's engine.** The audit filter's text was unreadable in WebKit, and this slice uses the same control for winners. A screenshot showed it, not a test. A test now covers it.
- **Moved: `useAction()`, `Outcome`, `Field` and `plainInput`** went from `Admin.tsx` to `src/shell/Form.tsx`, so the event screens can share them.
- **Added: `tsx`,** a dev dependency, to run the demo script.
- **Demo script:** beyond the design, it can also invite the admin, so one phone can see an invitation. `fund` cancels every open event and sets exact balances, so the review's numbers repeat.
- **Test first:** T6 and T8 had no true failing run, because the strict build fails first. The 25 deliberate breaks stand in for that. T1 to T5 and T7 failed first, but because the function didn't exist, not on each behaviour. I didn't break the SQL on purpose, as it's the live database.
- **Full suite per task:** after each task I ran the unit tests and that task's hosted and browser tests, not everything. The full suite ran at the end, because each hosted run adds accounts and counts against the Auth limit.
- **Migrations:** `events` and `forced_participation` contain `drop` statements, and both applied the first time, with no "confirmation expired". I can't tell whether anyone was asked.
- **The "Casino Tokens" artifact** couldn't be read in this session, as the artifact tools were unavailable. The screens follow the spec, the design and the existing look, so the artifact wasn't compared again.
