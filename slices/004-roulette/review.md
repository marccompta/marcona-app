# Slice 004 review

## 1. What to look at

MarcOna now has roulette. In the **Ruleta** tab, a player picks red or black, bets up to their limit and spins. The server decides the result, the wheel lands on it, and the spin appears in the balance and the audit. White always loses. As the admin, you can change the white chance and the maximum bet, or close the table.

Two things need you in particular:

- **Does the spin feel good?** Only you can judge this (REQ-113).
- **Does it work in Safari on your iPhone?** Windows blocked the WebKit browser tests on this computer, so no test has run in Safari's engine for this slice. See section 6.

This should take about 7 minutes. You'll use your phone as the admin, who is also a player, and a terminal once. What was agreed is in [spec.md](spec.md), and the work is in [tasks.md](tasks.md).

## 2. Before you start

- **You need:** your phone, ideally an iPhone, your admin login, which is `MARCONA_ADMIN_USERNAME` and `MARCONA_ADMIN_PASSWORD` in the gitignored `.env.test.local`, and a terminal at the repo root on this computer, with `npm install` already run.
- **Setup:** Run this once. It sets you and the demo players to exactly 100 marcones, and the first steps depend on that. **It also cancels and refunds every open event, including any you made by hand.**

  ```
  npm run demo -- fund 100
  ```

  It prints your username and each demo player with `100`, after a `cancelled` line for any event it closed.
- **Spins are random.** Where a step depends on the result, it says what to expect for each one.
- **Reset afterwards:** Step 10 puts the settings back to 1 in 37, 5% and open. If you stop before then, open **Administració**, tick **Taula oberta**, enter `37` and `5`, and tap **Desa la ruleta**. Your balance stays wherever the spins left it, so to go through the steps again, run `fund 100` first.

## 3. How to review

Open https://marccompta.github.io/marcona-app/. This slice's branch is what's deployed there, so `main` isn't live until the slice closes.

**Spinning:**

1. Log in and tap **Ruleta**. You should see **Saldo** 100, the wheel with one ivory pocket, **Vermell** already picked, **Aposta** set to 1, a gold **GIRA** button, and "Aposta màxima: 5 marcones", as in [table.png](evidence/screens/table.png). If you see "Aquesta pantalla arribarà aviat.", the new version isn't live yet, so wait a minute and reload.
2. Change **Aposta** to `5` and tap **GIRA**. The wheel starts at once, and a small gold ball circles the other way, as in [spinning.png](evidence/screens/spinning.png). The button says **GIRANT…** and **Saldo** stays at 100. The ball drops into a pocket, and 3 to 5 seconds after the tap the wheel stops with that pocket under the gold pointer. Only then does the colour's name appear. If it's **Vermell**, you see "Guanyes 5 marcones" and **Saldo** counts to 105, as in [result.png](evidence/screens/result.png). If it's **Negre** or **Blanc**, you see "Perds 5 marcones" and **Saldo** counts to 95. **Is that satisfying to watch?**
3. **Aposta màxima** is now 5 marcones at 105, or 4 marcones at 95. Tap **Negre**, change **Aposta** to `1` and tap **GIRA**. This time **Negre** wins 1, and anything else loses 1. Keep tapping **GIRA** until you've seen at least one win and one loss across these spins, which usually takes one or two more.

**Bets that are refused:**

4. Try each of these in **Aposta**, tapping **GIRA** each time. The wheel turns a little and stops, and **Saldo** doesn't change.
   - `0` and then `1.5` show "L'aposta ha de ser un nombre enter d'1 o més."
   - `50` shows "L'aposta supera el màxim que pots apostar ara.", as in [refused.png](evidence/screens/refused.png).

   If your keyboard has no `.`, type `1,5`, which gets the same message.

**The audit:**

5. Tap **Auditoria**. The newest rows are yours, one for each spin, with your choice and the result, such as "Ruleta: aposta a negre, ha sortit vermell", each with its amount and the balance after it, as in [audit.png](evidence/screens/audit.png). There's one row per spin, and none for the refused bets.

**Your settings:**

6. Tap **Administració** and scroll to **Ruleta**. **Taula oberta** is ticked, **Blanc: 1 de cada** is 37 and **Aposta màxima (% del saldo)** is 5. Change **Blanc: 1 de cada** to `1` and tap **Desa la ruleta**. You should see "La probabilitat de blanc ha de ser 1 entre un nombre enter de 2 a 1.000." Put it back to `37`, change the maximum to `101` and tap **Desa la ruleta**. You should see "L'aposta màxima ha de ser un percentatge enter de l'1 al 100."
7. Enter `2` and `10` and tap **Desa la ruleta**. You should see "S'han desat els canvis de la ruleta.", as in [settings.png](evidence/screens/settings.png). Tap **Ruleta**. **Aposta màxima** is now 10% of your **Saldo**, rounded down. The spec's example uses 1 in 10, but 1 in 2 lets you see white in a few spins.
8. Pick **Vermell**, set **Aposta** to `1` and spin until white comes up, which is now about every second spin. The ball lands in the ivory pocket, and you see **Blanc** and "Perds 1 marcona", as in [white.png](evidence/screens/white.png). The wheel still draws one ivory pocket, whatever the odds are.
9. Tap **Administració**, untick **Taula oberta** and tap **Desa la ruleta**. Tap **Ruleta**. You should see "La taula està tancada" and "Torna-hi quan torni a obrir.", with no wheel and no **GIRA**, as in [closed.png](evidence/screens/closed.png). The **Ruleta** tab is still there.
10. Tap **Administració**, tick **Taula oberta**, enter `37` and `5`, and tap **Desa la ruleta**. Tap **Ruleta**. The table is back, and **GIRA** works. This also does the reset from section 2.

**Optional, reduced motion:**

11. On your iPhone, turn on **Settings > Accessibility > Motion > Reduce Motion**, reload the site and spin. The wheel jumps straight to the result, with no turning. Turn the setting off again afterwards.

## 4. Checklist

| # | Requirement | Check | Expected result |
|---|---|---|---|
| 1 | REQ-101, REQ-102, REQ-112 | Steps 1 and 2 | The tab opens, the spin resolves, and the wheel lands on exactly the result shown |
| 2 | REQ-103, REQ-104 | Automated, see section 5 | About 18, 18 and 1 in 37 from a secure source |
| 3 | REQ-105 | Steps 2 and 3 | On a win, the balance rises by the bet |
| 4 | REQ-106 | Steps 2, 3 and 8 | A wrong colour takes the bet, and so does white |
| 5 | REQ-107 | Step 4 | `0` and `1.5` show Catalan, and the balance doesn't change |
| 6 | REQ-108, REQ-109 | Steps 1 and 3. Balances of 39 and 1 are automated | The maximum shown is right |
| 7 | REQ-110 | Step 4. Direct calls are automated | A bet above the limit is refused |
| 8 | REQ-111 | Step 5 | One movement per spin, with the choice and the result |
| 9 | REQ-113 | Step 2 | **Your judgement:** the spin feels good on your phone |
| 10 | REQ-114 | Step 11, or automated | No spin animation with reduced motion |
| 11 | REQ-115, REQ-116 | Steps 7 and 8 | Later spins use the new values, and you see the new maximum |
| 12 | REQ-117, REQ-118 | Steps 9 and 10. A spin sent to a closed table is automated | A closed table offers no spin, and it works again once reopened. Tests show a direct spin is refused |
| 13 | REQ-119 | Step 6. That the stored settings stay the same is automated | Catalan errors. The form keeps what you typed, and tests show nothing was saved |
| 14 | Not a requirement | All of it, on an iPhone | It works in real Safari, which no test has covered in this slice |

## 5. Already checked automatically

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test` | 106 passed |
| Hosted tests, on the real project, including balances of 39 and 1, direct calls above the limit, and direct spins on a closed table | `npm run test:hosted` | 166 passed, on the last full run. The only code change since is the wheel gradient, which they don't touch |
| Browser tests, Chromium, local build | `npx playwright test --project=chromium` | 165 passed, including the phone-sized smoke test on the real project (REQ-100) |
| Browser tests, Chromium, deployed site | `E2E_BASE_URL=https://marccompta.github.io/marcona-app/ npx playwright test --project=chromium` | 165 passed |
| **Browser tests, WebKit** | `npx playwright test --project=webkit` | **Not run: every test fails at launch. See section 6** |
| Build, with the type check | `npm run build` | Passed |
| Docs and traceability | `python scripts/check_docs.py` | Passed |
| Roulette rules | `tests/sql/roulette.sql` through `execute_sql` | All 5 checks passed. 370,000 draws gave 179,201 red, 180,717 black and 10,082 white. At 1 in 2, 400 spins gave 107 red, 94 black and 199 white, and only red paid a bet on red |
| Owner-level rules | `tests/sql/constraints.sql` through `execute_sql` | All 13 rejected |
| Payout maths | `tests/sql/events.sql` | Not run: no migration touched payouts or forced participation |
| Deliberate breaks | Throwaway scripts | All 11 behaviours broken in the screens were caught by a test. Two first failed at the build, so proved nothing, and were rewritten until they compiled and a test caught them. The SQL wasn't broken on purpose, as it's the live database |
| Wheel motion | A throwaway script sampled every frame of 3 spins in Chromium | About 60 frames a second, never backwards, with no jump in speed. A spin takes 3.3 to 5 seconds from the tap, depending on how far the wheel travels, and the auditor measured 3.8 to 4.9. A real phone may differ |
| Supabase advisors | `get_advisors`, security | Nothing new that needs fixing. `app_settings` has no policies on purpose, and a hosted test shows the browser can't reach it. The new functions get the usual `SECURITY DEFINER` warning, as they follow [ADR 0004](../../docs/adr/0004-money-in-postgres-functions.md) |

Instructions run as written: steps 1 to 10 were run on the deployed site by a script, in Chromium at iPhone 14 size, from a clean `fund 100`, and every expected result matched. Step 11 wasn't run on a phone, though the browser tests cover it. Nothing has been tried on a real phone or in Safari. Audit by `slice-auditor`: **failed on the wording of this file, not on the slice.** It ran the setup and all 11 steps on the deployed site in Chromium, with step 11 emulated, and every result on screen matched apart from step 4's "barely moves". Its main problem was that two spins often don't show both a win and a loss, so step 3 now says to keep spinning. Its other notes were fixed too: where the login is, rows 12 and 13, the spin time, the balance after a reset, a keyboard with no `.`, and unclear wording. No second audit ran after these edits, which change only this file. Its run left 6 more spins in the audit, and your balance at 92, which `fund 100` puts right.

## 6. Known limitations

- **WebKit didn't run.** Windows Smart App Control blocks the unsigned DLLs in Playwright's WebKit, so every test dies at launch with exit code `0xC0E90002`. It's logged in `Microsoft-Windows-CodeIntegrity/Operational`, on 6 November at 16:00 and 7 November at 14:00. Slice 003's WebKit runs fell between those, and why it changed is unknown. You chose to review on Chromium and check Safari yourself, so checklist row 14 is the only cover for Safari's engine in this slice. WebKit has caught real bugs before.
- **The wheel always draws one white pocket.** It's a picture, so when you change the odds, the drawing doesn't change. Players aren't told the current odds.
- **A refused bet starts the wheel briefly.** It turns from the tap, as [design.md](design.md) asks, and the refusal stops it. Bets aren't checked in the browser first.
- **With 0 marcones,** the screen shows a maximum of 1, as REQ-108 says, and tapping **GIRA** shows "El saldo no té prou marcones."
- **A lost connection shows the general error,** "Alguna cosa ha fallat. Torna-ho a provar.", not the no-connection one. This affects every function call, not just spins, so it's in the backlog as REQ-207. A retry can't spin twice.
- **Screens don't update themselves** until slice 006, so a closed table only shows after a reload or a refused spin.
- **Hosted tests change the real roulette settings** for a few seconds and put them back at the end. A run killed partway could leave them changed.
- **One full Chromium run had failures at login.** 4 real-project login tests failed, and they passed when rerun with fewer workers. It looks like the stall slice 003 recorded, whose cause is still unknown.

### Departures from the design, for the slice record

- **`public.roulette_state()`, added:** [design.md](design.md) didn't list it. The screens read the settings, balance and maximum bet from it, so the maximum bet rule exists only on the server, in `private.max_bet()`, and the browser has no access to `app_settings`.
- **Error codes:** `invalid_bet`, `invalid_choice`, `bet_too_high`, `roulette_closed`, `invalid_white_chance`, `invalid_max_bet_percent` and `invalid_roulette_settings`.
- **`spin()` locks the player before recording its request ID:** recording it, called claiming in the code, takes a shared lock on the same row, so two spins that claimed first would deadlock. Other money functions claim first, which is REQ-208 in the backlog, found by reading the code and not reproduced.
- **`tests/sql/roulette.sql`, added:** hosted tests can't make white come up, so this lowers the odds inside a rolled-back transaction. A hosted test checks the same on the real table.
- **The review uses your admin account,** not a demo player as [design.md](design.md) said. Demo passwords aren't kept, and the admin is also a player.
- **Existing tests changed:** REQ-046 now looks for password inputs, as Ruleta rightly has a bet field. `tests/hosted/screens.test.ts` expects the new `details` field. `Placeholder.tsx` and its text are gone, as Ruleta was its last use.
- **Test first:** the tests for tasks T1, T2, T4 and T6 failed before they passed, though T1 and T2 failed because the functions didn't exist. T3's tests never had a failing run, because the migration went in at the same step that a script of mine stopped. T5's unit tests failed first, but its browser tests failed at the strict build. The deliberate breaks stood in for those.
- **Full suite per task:** after each task I ran the unit tests and that task's tests, not everything. The full suites ran at the end, on Chromium only.
- **Migrations:** of the three in this slice, `spin` contains a `drop constraint`, and all three applied the first time. I can't tell whether anyone was asked, and the same goes for `execute_sql`.
- **The demo reset:** `fund 100` cancelled and refunded two open events during the rehearsal, "Un altre test" and "Otro".

## 7. Your verdict

Type one of these in a Claude Code session started at the repo root:

- `/slice-verdict 004 approve`
- `/slice-verdict 004 changes <what to fix>`
- `/slice-verdict 004 reject <why>`

## Review log

### Round 1

- Verdict: pending
- Date:
- Notes:
