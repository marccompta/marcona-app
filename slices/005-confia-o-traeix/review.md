# Slice 005 review

## 1. What to look at

The first secret-choice game is here. As the admin you can now set up **Confia o traeix**, a duel between two people, playing in it or just running it. Each player opens a private panel on their phone and taps Confia or Traeix. Tapping again changes the pick, nothing shows who has picked, and the moment the second person picks, both phones turn over two cards and pay out. Under **Administració**, you can edit the game's numbers and watch a worked example change as you type.

There are three things only you can judge: **does the resting screen really give nothing away, does the two-second glow feel clear, and is the reveal dramatic enough?** It takes about 10 minutes, on your phone, with Claude's script playing the other side from a terminal. Secrecy and payouts are covered by tests, listed in section 5.

## 2. Before you start

- **You need:** your phone, your admin login, and a PowerShell terminal in `C:\Repos\marcona-app`. The commands say `npm.cmd`, because plain `npm` is blocked by this computer's PowerShell script policy. Your login is `MARCONA_ADMIN_USERNAME` and `MARCONA_ADMIN_PASSWORD` in the gitignored `.env.test.local`. An iPhone is best, as it's the only real check of Safari.
- **Setup:** run this, which cancels every open event and sets you, `demo-nuria` and `demo-pau` to exactly 100 marcones:

  ```powershell
  npm.cmd run demo -- fund 100
  ```

  It ends by listing each of those accounts with `: 100`.
- **The Events list is busy.** Automated tests played real duels between the demo players, so **Passats** holds many called "Prova automàtica" and "Fum …". They go when test data is wiped before the gathering.
- **Earlier rehearsals.** Claude ran these steps first, so **Passats** already holds several events called Duel1, Duel2 and Duel3. Yours will be the newest.
- **Reset afterwards:** step 13 puts the settings back. Everything else is demo data, which the wipe removes.

## 3. How to review

Open https://marccompta.github.io/marcona-app/ on your phone, reload so you get the new version, and log in. This slice's branch is what's deployed there.

### Play a duel

1. Tap **Esdeveniments**, then **Nou esdeveniment**. There's a new **Tipus** list at the top. Choose **Confia o traeix**, as in [new-duel.png](evidence/screens/new-duel.png). The payout percentages go, **Hi jugo** appears, ticked, and under **Convida** it says **Només 1 persona: l'altra ets tu.**
2. Set **Nom** to `Duel1` and **Entrada** to `10`, tick `demo-nuria`, and tap **Crea l'esdeveniment**. The event opens with the rules and three payoffs: **15 marcones** each if both trust, **25** and **0** if one betrays, **5** each if both betray. You're in the list with the crown, `demo-nuria` is **Pendent**, and it says **Falta que les dues persones hi entrin.** There's no way to pick a choice yet, and, unlike a classic event, no way to pick a winner.
3. In the terminal, run this and keep your phone on the event:

   ```powershell
   npm.cmd run demo -- accept Duel1
   ```

   It prints `demo-nuria accepted Duel1`. Within about 3 seconds, with no reload, `demo-nuria` shows **Hi participa**, and **Tria en privat** appears at the bottom of the page and the line above it changes to **Les dues persones estan triant.** Scroll down to it, as in [resting.png](evidence/screens/resting.png). **Remember how this screen looks.**
4. Tap **Tria en privat**. A panel covers the whole screen, with two big buttons set well apart, as in [panel.png](evidence/screens/panel.png).
5. Tap **Confia**. There's no question and no confirmation: the button lights up gold for two seconds and goes back to normal, as in [glow.png](evidence/screens/glow.png). Nothing else on the screen changes. **Is the glow clear enough?**
6. Tap **Traeix**. It glows the same way. Your pick is now Traeix.
7. Tap **Tanca**. The resting screen looks exactly as it did at step 3. Open the panel again: the same two plain buttons, with nothing saying what you picked. Tap **Tanca** again. **Could a glance at your phone give you away?**
8. In the terminal:

   ```powershell
   npm.cmd run demo -- pick Duel1 confia
   ```

   It prints `demo-nuria picked confia, and the duel is revealed`. Keep your eyes on the phone. Within about 3 seconds it jumps up to two face-down cards, which turn one at a time, yours first, as in [reveal-first.png](evidence/screens/reveal-first.png). About 4 seconds later comes **Traïció!**, with confetti and a large `+15`, which is your gain after the 10 you paid. The `+15` covers the middle of the cards for a little over a second, then goes. Under the cards are the results: you, **Traeix**, **25 marcones**, and `demo-nuria`, **Confia**, **0 marcones**, as in [reveal-win.png](evidence/screens/reveal-win.png). **Is it dramatic enough?** Your last tap is the one that counted.
9. Tap **Auditoria**. The top three rows are Duel1: your **Premi** of **+25**, then `demo-nuria`'s **Entrada** of **-10**, then yours. `demo-nuria` has no prize row, because a payout of 0 writes no movement.

### Run a duel without playing

10. Tap **Esdeveniments**, then **Nou esdeveniment**. Choose **Confia o traeix**, set **Nom** to `Duel2` and **Entrada** to `10`, untick **Hi jugo**, and the line under **Convida** changes to **Exactament 2 persones.** Tick `demo-nuria`, `demo-pau` and **Participació obligatòria**, and tap **Crea l'esdeveniment**. At the top you show under **Organitza** with the crown, not as a participant. Further down both demo players are already in, and you have no **Tria en privat**, as in [organiser.png](evidence/screens/organiser.png). Now run the first of these, wait about 7 seconds, and check that **nothing on your phone changes**. Then run the second:

    ```powershell
    npm.cmd run demo -- pick Duel2 traeix demo-nuria
    npm.cmd run demo -- pick Duel2 traeix demo-pau
    ```

    Within about 3 seconds the cards appear, and about 4 seconds later you see **Doble traïció**, with **5 marcones** each, as in [reveal-both.png](evidence/screens/reveal-both.png). There's no confetti, because you weren't playing. Tap **Auditoria**: the top four rows are Duel2, two prizes of **+5** and two **Entrada obligatòria** of **-10**, all on `demo-nuria` and `demo-pau`. The entries say **Feta per** you, but none of the four is on your balance, so you paid nothing.

### Change the settings

11. Tap **Administració** and scroll to **Jocs**. Change **Totes dues confien (%)** to `120`. The example underneath changes as you type, to **12 marcones (120%)**, as in [settings.png](evidence/screens/settings.png). While a field is empty, the example pauses. Now change **Totes dues traeixen (%)** to `200` and tap **Desa el joc**: a Catalan error explains the order the numbers must keep. Put it back to `50`, tap **Desa el joc**, and it says the changes are saved for new events.
12. Create one more duel: **Confia o traeix**, **Nom** `Duel3`, **Entrada** `10`, **Hi jugo** ticked, inviting `demo-pau`. Its first payoff now says **12 marcones (120%)**. Then run this, and within about 3 seconds the duel shows **Cancel·lat**:

    ```powershell
    npm.cmd run demo -- decline Duel3
    ```

    Tap **Auditoria**: the top row is your **Devolució de l'entrada** of **+10** on Duel3.

13. **Put the settings back.** Under **Administració**, set **Totes dues confien (%)** to `150`, untick **Joc actiu** and tap **Desa el joc**. Tap **Esdeveniments**, then **Nou esdeveniment**: **Tipus** now offers only **Clàssic**. Tap the **Administració** tab, tick **Joc actiu** again and tap **Desa el joc**. It must end with **Joc actiu** ticked and the numbers at 150, 250, 0 and 50.

## 4. Checklist

| # | Requirement | Check | Expected result |
|---|---|---|---|
| 1 | REQ-175 | Step 1 | The admin can choose classic or Confia o traeix |
| 2 | REQ-177, REQ-176 | Automated | A player only gets a classic event, and the API refuses them a game |
| 3 | REQ-121, REQ-146 | Step 13, and automated | A game that's off isn't offered, and the server refuses it |
| 4 | REQ-178, REQ-179 | Steps 1, 2 and 9 | You can choose to play, you're listed as a player, and the audit shows your entry |
| 5 | REQ-180 | Automated | An admin without the buy-in sees a Catalan error, and no event exists |
| 6 | REQ-181 | Step 10 | When not playing, you aren't charged or listed as a player |
| 7 | REQ-182 | Steps 1 and 10, and automated | The form says how many to invite, and the wrong number is refused |
| 8 | REQ-123, REQ-124 | Steps 2 and 8, and automated | A duel has no way to pick a winner, and the API refuses it |
| 9 | REQ-122, REQ-149 | Automated | A running duel keeps its numbers after a settings change |
| 10 | REQ-183 | Step 12 | A decline cancels the duel and refunds whoever paid |
| 11 | REQ-184 | Automated | Removing an invited player cancels the duel and refunds whoever paid |
| 12 | REQ-125, REQ-139, REQ-202, REQ-203 | Steps 4 to 6 | **Your judgement:** one tap saves, with no confirmation. The button glows clearly for two seconds, and nothing else changes |
| 13 | REQ-202 | Steps 6 and 8, and automated | The last tap counts, even on a slow connection |
| 14 | REQ-204 | Automated | A tap after both have picked changes nothing, and shows the reveal |
| 15 | REQ-127 | Step 8, and automated | The reveal happens at once, and pays exactly once, even when both tap together |
| 16 | REQ-128 | Automated | Nobody can read a choice through the API, a function or Realtime |
| 17 | REQ-129, REQ-131 | Steps 2 and 7 | The rules and payoffs are in full, and nothing hints at a choice |
| 18 | REQ-132, REQ-145 | Steps 8 and 9 | Every choice and payout shows, and the payouts are ordinary movements |
| 19 | REQ-133 | Step 8 | **Your judgement:** the reveal is dramatic. Reduced motion is covered by tests |
| 20 | REQ-134 | Steps 3, 8 and 10 | The phone updates by itself within about 3 seconds |
| 21 | REQ-135 | Automated | Cancelling a stuck duel refunds both players |
| 22 | REQ-140 to REQ-143 | Steps 2, 8 and 10, and automated | The payouts match the table, rounded down |
| 23 | REQ-144 | Step 11, and automated | Numbers that break the order show a Catalan error. Tests check that nothing is saved |
| 24 | REQ-146, REQ-147 | Steps 11 to 13, and automated for the description | New events use the changes |
| 25 | REQ-148 | Step 11 | The worked example changes as you type |
| 26 | REQ-191 | Step 10 | A forced duel charges both and goes straight to choosing |
| 27 | REQ-194 | Step 10, and automated | Nothing changes on your screen when someone locks in |
| 28 | REQ-195, REQ-198 | Step 7 | **Your judgement:** a glance at your phone gives nothing away |
| 29 | Not a requirement | All of it, on an iPhone | It works and runs smoothly in real Safari. Tests cover WebKit on Linux, not an iPhone |

## 5. Already checked automatically

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test` | 114 passed |
| Build, with the type check | `npm run build` | Passed |
| Browser tests, Chromium, local build | `npx playwright test --project=chromium --workers=3` | 241 passed, 63 of them new tests of games, including the phone-sized smoke test of a real duel (REQ-100) |
| Browser tests, WebKit and Chromium, on Linux in GitHub Actions | The `browsers` job in `.github/workflows/ci.yml` | 466 passed: 233 in each engine. 16 skipped: the 8 tests per engine that need the real project |
| **Browser tests, WebKit, on this computer** | `npx playwright test --project=webkit` | **Not run: Windows Smart App Control blocks it, as in slice 004** |
| Hosted tests, on the real project | `npm run test:hosted` | 179 passed, 13 of them new tests of games through the real API |
| Game rules and payouts | `tests/sql/games.sql`, through `execute_sql` | All 80 checks passed |
| Owner-level rules | `tests/sql/constraints.sql`, through `execute_sql` | All 18 rejected, 5 of them new |
| Payout maths and forced participation | `tests/sql/events.sql`, through `execute_sql` | All passed, with 61,812 splits checked. Run because the migrations rewrote `complete_event` and `answer_invitation` |
| Roulette odds | `tests/sql/roulette.sql` | Not run: no migration touched it |
| Docs and traceability | `python scripts/check_docs.py` | Passed |
| Supabase advisors | `get_advisors` | Nothing new in kind. The new `private.choices` joins the expected "no policies" note, and the new public functions join the expected note on signed-in users calling functions |
| Deliberate breaks | Throwaway scripts | All 14 ways of breaking the screens were caught in the end. Two survived at first and exposed weak tests, where a retrying check simply waited out a glow or an animation. Both tests are fixed. Three first failed at the build and one changed nothing, so they proved nothing until rewritten. The SQL wasn't broken on purpose, as it's the live database |

Looking at the screenshots found what no test had: **the reveal played off-screen.** **Tria en privat** is at the bottom of a long page, so a player was scrolled away from the cards. The reveal now brings itself into view, and a test covers it.

One full run of the game tests had a single failure, straight after a deliberate break, and it didn't happen again in the next 310 test runs. The likely cause is that run reusing the broken build's server, but that isn't proven. The first full Chromium run also had one real-project login failure, which passed on a rerun. It looks like the stall recorded in slices 003 and 004.

Instructions run as written: a script ran steps 1 to 13 on the deployed site, in Chromium at 360 by 740, logged in as the admin, using the commands exactly as above, and every expected result matched. Nothing has been tried on a real phone or in real Safari. Audit by `slice-auditor`: **failed on the wording of this file, not on the slice.** It ran the setup and all 13 steps on the deployed site in Chromium, logged in as the admin, and every result on screen matched: the panel and resting screen were pixel-identical before and after a pick, and also after a reload. It left the settings at 150, 250, 0 and 50, with the game on. Its main catch was that plain `npm` is blocked by this computer's PowerShell policy, which would have stopped you at setup. The commands now say `npm.cmd`, which I checked under that policy. It also found checklist rows claiming money results their steps didn't show, an unclear step 13, a screenshot caught mid-fade, and a button that's at the bottom of the page rather than the screen. All are fixed, and the balance checks are now in steps 10 and 12. Its claim that `AGENTS.md` lacks `pick` and `tests/sql/games.sql` was wrong, as both are there. After these edits a script ran all 13 steps again as written, with every result matching, but no second audit ran.

## 6. Known limitations

- **Someone watching a player tap sees the tap.** The app hides the state afterwards, not the moment itself, as the design says.
- **The second player's first tap is final, and they can't know they're second.** This follows from revealing the moment both have picked. The panel says so without saying who has picked.
- **The Pendent status can lag.** When one of two invited players accepts, the other phones show it only at the next change of phase or a reload. The screen only checks the game's phase, which is the same for everyone by design. Live updates are slice 006.
- **A stuck duel has no hint.** If one player never picks, nobody can tell who, including you. You ask them or cancel, as the design decided.
- **The reveal plays once per phone,** using browser storage. If storage is blocked, it plays on every visit. Nothing asked for this: it was the simplest way to play it for someone who wasn't watching when it happened.
- **The admin's own duels fill the demo accounts' history.** Automated tests had to use `demo-nuria` and `demo-pau`, because the admin can't invite test accounts. Every hosted run adds about 20 duels to **Passats** until the wipe.

## 7. Your verdict

Type one of these in a Claude Code session started at the repo root:

- `/slice-verdict 005 approve`
- `/slice-verdict 005 changes <what to fix>`
- `/slice-verdict 005 reject <why>`

## Review log

### Round 1

- Verdict: pending
- Date:
- Notes:
