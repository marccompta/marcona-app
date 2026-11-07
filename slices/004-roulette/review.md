# Slice 004 review

## 1. What to look at

This is round 2, and it covers only what you asked for: a win now feels like a win. When the wheel stops on your colour, the marcones you just won pop up large and gold over the wheel for about a second, and confetti in the table's colours bursts from the wheel across the whole screen. Losses stay as they were. The round 1 steps are in this file's git history.

The question for you is the one you raised: **is it dopaminic enough, on your phone?** It should take about 3 minutes, on your phone only. The notes are in the review log below, and the work is R1.1 and R1.2 in [tasks.md](tasks.md).

## 2. Before you start

- **You need:** your phone, and your admin login, which is `MARCONA_ADMIN_USERNAME` and `MARCONA_ADMIN_PASSWORD` in the gitignored `.env.test.local`. An iPhone is best, as it's the only real check of Safari. With another phone, everything except step 5's path works the same, and row 8 stays open.
- **Setup:** None. The table is open at 1 in 37 and 5%, and any balance of at least 1 marcona will do. If you have 0, add some under **Administració**. There's no need for `npm run demo -- fund 100` this time, which would cancel your open events.
- **Spins are random.** A win takes about two spins on average.
- **Reset afterwards:** Nothing to clean up, unless you try step 5 and need to turn **Reduce Motion** off again. Your balance stays wherever the spins leave it.

## 3. How to review

Open https://marccompta.github.io/marcona-app/ and reload, so you get the new version. This slice's branch is what's deployed there.

1. Log in, tap **Ruleta** and pick **Vermell**. Set **Aposta** to the number shown as **Aposta màxima**, and tap **GIRA**. Keep spinning until you win. The maximum follows your balance, so after a loss your bet may be refused: if it is, set **Aposta** to the new maximum. The steps below use a bet of 5, so expect your own amount in its place.
2. **On a win:** while the wheel turns, nothing gives the result away. The moment it stops, a large gold `+5` with "marcones" under it pops over the middle of the wheel, and confetti bursts out from the wheel, as in [win.png](evidence/screens/win.png). **Saldo** counts up at the same time. The number goes after about a second, the confetti falls away within about 2 seconds, and "Vermell" and "Guanyes 5 marcones" stay under the wheel. **Does it feel good enough?**
3. **On a loss:** the wheel stops and you see the colour and "Perds 5 marcones", with no big number and no confetti, as before.
4. Win again, and be quick this time, as the number only lasts about a second. Within that second, tap **Negre**, which responds at once, as nothing blocks the controls, and then **GIRA**. The number and the confetti clear straight away, and the wheel spins as normal.
5. **Optional, reduced motion:** on your iPhone, turn on **Settings > Accessibility > Motion > Reduce Motion**, reload and spin until you win. The wheel doesn't turn at all: it jumps straight to the result, and **Saldo** changes at once with no counting. That's what the setting is for. The `+5` appears still for about a second, and there's no confetti. Turn the setting off again afterwards.

**Regression check:**

6. Tap **Auditoria**. There's one row for each spin, with your choice and the result, such as "Ruleta: aposta a vermell, ha sortit negre". Refused bets have no row.

## 4. Checklist

| # | Requirement | Check | Expected result |
|---|---|---|---|
| 1 | R1.1, REQ-113 | Step 2 | Confetti bursts from the wheel on a win, and only once the wheel has stopped |
| 2 | R1.2, REQ-113 | Step 2 | The marcones won show large over the wheel for about a second |
| 3 | REQ-113 | Step 2 | **Your judgement:** it feels good on your phone |
| 4 | REQ-106 | Step 3 | A loss celebrates nothing, including white, which tests cover |
| 5 | REQ-112 | Steps 2 and 4 | Nothing gives the result away before the wheel stops, and a new spin clears the last celebration |
| 6 | REQ-114 | Step 5, or automated | No confetti with reduced motion, and the amount shows still |
| 7 | REQ-111 | Step 6 | One row per spin, with the choice and the result |
| 8 | Not a requirement | All of it, on an iPhone | It works and runs smoothly in real Safari. Tests cover WebKit on Linux, not an iPhone |

## 5. Already checked automatically

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test` | 107 passed |
| Browser tests, Chromium, local build | `npx playwright test --project=chromium` | 177 passed, including the phone-sized smoke test on the real project (REQ-100) |
| Browser tests, Chromium, deployed site | `E2E_BASE_URL=https://marccompta.github.io/marcona-app/ npx playwright test --project=chromium` | 177 passed |
| Browser tests, WebKit and Chromium, on Linux in GitHub Actions | The `browsers` job in `.github/workflows/ci.yml` | 340 passed: 170 in each engine, including all 12 new tests of a win. 14 skipped: the 7 tests per engine that need the real project |
| **Browser tests, WebKit, on this computer** | `npx playwright test --project=webkit` | **Not run: every test fails at launch. See section 6** |
| Build, with the type check | `npm run build` | Passed, as part of the browser tests |
| Docs and traceability | `python scripts/check_docs.py` | Passed |
| Hosted tests | `npm run test:hosted` | Not rerun this round: 166 passed in round 1, and nothing in the database or the data reads changed |
| SQL checks | `tests/sql/roulette.sql`, `tests/sql/constraints.sql` | Not rerun this round: no migration. All passed in round 1 |
| Deliberate breaks | Throwaway scripts | All 13 ways of breaking the celebration were caught. One, celebrating every result, survived at first: a check kept retrying until the wrong celebration had ended by itself. Those checks are now immediate, and it's caught. Another first failed at the build, so proved nothing, and was rewritten until it compiled and a test caught it |

Instructions run as written: a script ran steps 1 to 4 and step 6 on the deployed site, in Chromium at iPhone 14 size, with a hidden test account rather than yours, and every expected result matched. Step 5 is covered by the browser tests, not a phone. Nothing has been tried on a real phone or in real Safari. Audit by `slice-auditor`: **failed on the wording of this file, not on the slice.** It ran all 6 steps on the deployed site in Chromium with hidden test accounts, with step 5 emulated, and every result on screen matched. It measured the number at about 1.2 seconds and the confetti at about 1.9, and with reduced motion, no confetti in 6 spins. Its problems were a wrong balance in section 2, as a bet of 5 needs 100 marcones at 5%, an out-of-date row number, and step 4 being too slow to see the number clear. Those and its smaller notes are fixed. No second audit ran after these edits, which change only this file. It left 3 hidden test accounts, which go in the wipe.

## 6. Known limitations

- **The celebration's speed on a real phone is unknown.** The confetti draws 110 pieces on a canvas. It ran smoothly in the browser tests, but no phone has tried it, and an older phone may do less well.
- **Every win celebrates the same,** whatever its size.
- **WebKit can't run on this computer.** Windows Smart App Control blocks the unsigned DLLs in Playwright's WebKit, so every test dies at launch with exit code `0xC0E90002`. It's logged in `Microsoft-Windows-CodeIntegrity/Operational`, on 6 November at 16:00 and 7 November at 14:00. Slice 003's WebKit runs fell between those, and why it changed is unknown. So WebKit now runs in GitHub Actions instead, on Linux, against the fake Supabase. Two things stay untested in WebKit: the real project, including the smoke test, and an actual iPhone, which is what checklist row 8 is for.
- **The wheel always draws one white pocket.** It's a picture, so when you change the odds, the drawing doesn't change. Players aren't told the current odds.
- **A refused bet starts the wheel briefly.** It turns from the tap, as [design.md](design.md) asks, and the refusal stops it. Bets aren't checked in the browser first.
- **With 0 marcones,** the screen shows a maximum of 1, as REQ-108 says, and tapping **GIRA** shows "El saldo no té prou marcones."
- **A lost connection shows the general error,** "Alguna cosa ha fallat. Torna-ho a provar.", not the no-connection one. This affects every function call, not just spins, so it's in the backlog as REQ-207. A retry can't spin twice.
- **Screens don't update themselves** until slice 006, so a closed table only shows after a reload or a refused spin.
- **Hosted tests change the real roulette settings** for a few seconds and put them back at the end. A run killed partway could leave them changed.
- **Two full Chromium runs had failures at login.** In round 1, 4 real-project login tests failed, and in round 2, 1 did. All passed when rerun with fewer workers. It looks like the stall slice 003 recorded, whose cause is still unknown.

### Departures from the design, for the slice record

- **`public.roulette_state()`, added:** [design.md](design.md) didn't list it. The screens read the settings, balance and maximum bet from it, so the maximum bet rule exists only on the server, in `private.max_bet()`, and the browser has no access to `app_settings`.
- **Error codes:** `invalid_bet`, `invalid_choice`, `bet_too_high`, `roulette_closed`, `invalid_white_chance`, `invalid_max_bet_percent` and `invalid_roulette_settings`.
- **`spin()` locks the player before recording its request ID:** recording it, called claiming in the code, takes a shared lock on the same row, so two spins that claimed first would deadlock. Other money functions claim first, which is REQ-208 in the backlog, found by reading the code and not reproduced.
- **`tests/sql/roulette.sql`, added:** hosted tests can't make white come up, so this lowers the odds inside a rolled-back transaction. A hosted test checks the same on the real table.
- **The review uses your admin account,** not a demo player as [design.md](design.md) said. Demo passwords aren't kept, and the admin is also a player.
- **Existing tests changed:** REQ-046 now looks for password inputs, as Ruleta rightly has a bet field. `tests/hosted/screens.test.ts` expects the new `details` field. `Placeholder.tsx` and its text are gone, as Ruleta was its last use.
- **Test first:** the tests for tasks T1, T2, T4 and T6 failed before they passed, though T1 and T2 failed because the functions didn't exist. T3's tests never had a failing run, because the migration went in at the same step that a script of mine stopped. T5's unit tests failed first, but its browser tests failed at the strict build. The deliberate breaks stood in for those.
- **Full suite per task:** after each task I ran the unit tests and that task's tests, not everything. The full suites ran at the end, on Chromium here and in both engines on GitHub.
- **CI, added at your request:** a `browsers` job runs the browser tests in both engines on each PR and on each push to `main` or a slice. It's tooling, added after the handover, and it changed no app code.
- **Migrations:** of the three in this slice, `spin` contains a `drop constraint`, and all three applied the first time. I can't tell whether anyone was asked, and the same goes for `execute_sql`.
- **The demo reset:** `fund 100` cancelled and refunded two open events during the rehearsal, "Un altre test" and "Otro".
- **Round 2, `src/screens/WinBurst.tsx`, added:** the amount and the confetti, drawn on a canvas with no new dependency. I treated your notes as a fix under REQ-113, so there's no new requirement.
- **Round 2, reduced motion:** my call, as you didn't say. The amount stays, as it isn't movement, and the confetti goes.
- **Round 2, smoke test:** it assumed a 5% limit, and failed when you set 10%. It now bets 1, which is allowed at any setting. You said that change was yours, and asked me to put it back to 5%, which I did.
- **Round 2, test timing:** the amount's time on screen is now measured in the browser, after a check that ran in the test runner failed once on a busy machine.

## 7. Your verdict

Type one of these in a Claude Code session started at the repo root:

- `/slice-verdict 004 approve`
- `/slice-verdict 004 changes <what to fix>`
- `/slice-verdict 004 reject <why>`

## Review log

### Round 1

- Verdict: changes
- Date: 2026-11-07
- Notes: Add confetti and show in a more prominent way the marcones that you just win (for a second) in case of winning the roulette. Something a little bit more "dopaminic"
  1. Add confetti in case of winning the roulette.
  2. Show in a more prominent way the marcones that you just win (for a second).

### Round 2

- Verdict: approve
- Date: 2026-11-07
- Notes: None.
