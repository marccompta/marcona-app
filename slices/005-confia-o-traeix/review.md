# Slice 005 review

## 1. What to look at

This is round 2, and it covers only what you asked for:

1. The glow lasts 0.7 seconds, not 2.
2. Only the outer border of the card glows, and the card itself doesn't change.
3. The cards in the private panel now look like the ones on the result screen: rounded, ivory Confia and red Traeix, side by side.

The questions for you are the ones you raised: **is the glow right now, and do the cards look the way you wanted?** It takes about 5 minutes on your phone, with a terminal for the demo commands. Your notes are in the review log below, and the work is R1.1 to R1.3 in [tasks.md](tasks.md). The round 1 steps are in this file's git history, at commit `52ca978`.

Changing the glow meant changing an approved requirement, so REQ-210 now replaces REQ-203, as you chose. Side by side also means the cards are 14px apart rather than well apart, which section 6 mentions.

## 2. Before you start

- **You need:** your phone, your admin login, and a PowerShell terminal in `C:\Repos\marcona-app`. Your login is `MARCONA_ADMIN_USERNAME` and `MARCONA_ADMIN_PASSWORD` in the gitignored `.env.test.local`. An iPhone is best, as it's the only real check of Safari. The commands say `npm.cmd`, because plain `npm` and `npx` are blocked by this computer's PowerShell script policy.
- **Setup:** run this, which cancels every open event and sets you, `demo-nuria` and `demo-pau` to exactly 100 marcones:

  ```powershell
  npm.cmd run demo -- fund 100
  ```

  It ends by listing each of those accounts with `: 100`.
- **Your settings stay as they are.** **Qui traeix (%)** is now 300. It was saved after Claude's last run in round 1, presumably by you during the review, and Claude hasn't touched it. The numbers below use it: a buy-in of 10 pays a betrayer **30 marcones**. If you've changed it again, go by the rules on the event's screen.
- **Earlier rehearsals.** Claude ran these steps first, so **Passats** already holds events called Repte1 and Repte2. Yours will be the newest.
- **Reset afterwards:** Nothing to clean up. It's all demo data, which the wipe removes.

## 3. How to review

Open https://marccompta.github.io/marcona-app/ on your phone, reload so you get the new version, and log in. This slice's branch is what's deployed there.

1. Tap **Esdeveniments**, then **Nou esdeveniment**. Choose **Confia o traeix** under **Tipus**, set **Nom** to `Repte1` and **Entrada** to `10`, leave **Hi jugo** ticked, tick `demo-nuria`, and tap **Crea l'esdeveniment**.
2. In the terminal, run this:

   ```powershell
   npm.cmd run demo -- accept Repte1
   ```

   It prints `demo-nuria accepted Repte1`. Within about 3 seconds **Tria en privat** appears at the bottom of the page. Scroll down and tap it.
3. **The cards (item 3).** Two cards sit side by side: rounded, ivory **Confia** and red **Traeix**, the same size and shape as each other, as in [panel.png](evidence/screens/panel.png). **Do they look the way you wanted?** Step 7 shows the result screen, to compare.
4. **The glow (items 1 and 2).** Tap **Confia**. A moment later, once the server has saved it, its outer edge lights up gold for 0.7 seconds and goes, as in [glow.png](evidence/screens/glow.png). The card keeps its colour and text, and nothing else on the screen changes. On mobile data the moment before it lights may be longer. **Is it right now?**
5. Tap **Traeix**. Its edge lights up the same way, as in [glow-traeix.png](evidence/screens/glow-traeix.png). Your pick is now Traeix.
6. Tap **Tanca**, then **Tria en privat** again. The same two plain cards, with nothing lit and nothing saying what you picked. Tap **Tanca**.
7. In the terminal:

   ```powershell
   npm.cmd run demo -- pick Repte1 confia
   ```

   It prints `demo-nuria picked confia, and the duel is revealed`. Within about 3 seconds the phone jumps up to two face-down cards, which turn one at a time, yours first. About 4 seconds later comes **Traïció!**, with confetti and a large `+20`, which is your gain: the 30 you won less the 10 you paid. Once that's gone, a little over a second later, the cards look as in [reveal-result.png](evidence/screens/reveal-result.png): you, **Traeix**, **30 marcones**, and `demo-nuria`, **Confia**, **0 marcones**. Your last tap is the one that counted. Here the cards are in player order, with yours first, so Traeix is on the left, while the panel always has Confia on the left.

**Regression check: the glow comes first on the last tap**

8. Tap the **Esdeveniments** tab, then **Nou esdeveniment**. Choose **Confia o traeix**, set **Nom** to `Repte2` and **Entrada** to `10`, leave **Hi jugo** ticked, tick `demo-nuria` and **Participació obligatòria**, and tap **Crea l'esdeveniment**. Then run this:

   ```powershell
   npm.cmd run demo -- pick Repte2 traeix
   ```

   It prints `demo-nuria picked traeix`. Nothing changes on your phone, because a pick stays hidden.

9. Scroll down and tap **Tria en privat**, then tap **Confia**. This tap completes the pair: the edge glows for 0.7 seconds, and only then does the reveal start. It ends with **Traïció!**, **demo-nuria ha traït** you, and no confetti, because you lost.

## 4. Checklist

| # | Requirement | Check | Expected result |
|---|---|---|---|
| 1 | R1.1, REQ-210 | Steps 4 and 5 | **Your judgement:** the glow lasts 0.7 seconds. A test measures it |
| 2 | R1.2, REQ-210 | Steps 4 and 5 | **Your judgement:** only the outer border glows. A test checks that the card's colour and text don't change |
| 3 | R1.3, no requirement covers the look | Steps 3 and 7 | **Your judgement:** the cards look like the ones on the result screen. A test compares their colours, corners, lettering and shape |
| 4 | REQ-198, REQ-195 | Step 6 | The cards look the same whether or not you've picked |
| 5 | REQ-202 | Steps 5 and 7, and automated | The last tap counts. A test covers quick taps on a slow connection, where the taps go in order and the last one wins |
| 6 | REQ-133, REQ-210 | Step 9 | The tap that completes the pair glows first, then the reveal starts |
| 7 | REQ-204 | Automated | A tap after both have picked changes nothing and doesn't glow |
| 8 | Not a requirement | All of it, on an iPhone | It works and looks right in real Safari. Tests cover WebKit on Linux, not an iPhone |

## 5. Already checked automatically

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm.cmd test` | 114 passed |
| Browser tests, Chromium, local build | `npx.cmd playwright test --project=chromium --workers=3` | 243 passed, including a real duel on the hosted project. An earlier run had one failure, that real duel, because it expected the default 250%. It's fixed, and this full run is after the fix |
| The game browser tests, under load | `npx.cmd playwright test tests/e2e/games.spec.ts --project=chromium --repeat-each=4` | 260 passed, run because a 0.7-second glow leaves tests much less time |
| Browser tests, WebKit and Chromium, on Linux in GitHub Actions | The `browsers` job in `.github/workflows/ci.yml` | 470 passed: 235 in each engine. 16 skipped: the 8 tests per engine that need the real project |
| **Browser tests, WebKit, on this computer** | `npx.cmd playwright test --project=webkit` | **Not run: Windows Smart App Control blocks it, as in slice 004** |
| Hosted tests, on the real project | `npm.cmd run test:hosted` | 179 passed |
| SQL checks | `tests/sql/games.sql`, `constraints.sql`, `events.sql` | Not rerun this round: no migration. All passed in round 1 |
| Docs and traceability | `python scripts/check_docs.py` | Passed |
| Deliberate breaks | Throwaway scripts | The tests for items 1 to 3 failed before the fixes went in. "A late tap glows" and "the reveal doesn't wait for the glow" were broken again, because their tests changed, and both are caught |

Your change to **Qui traeix (%)** exposed a fault in my tests, not the app: the smoke test and two hosted tests assumed the default numbers. They now read them from each duel's stored settings.

The border test first passed against the old full-card glow, because it read the colours before the fade had started. It now reads them mid-glow, and failed as it should before the fix.

Instructions run as written: a script ran steps 1 to 9 on the deployed site, in Chromium at 360 by 740, logged in as the admin, using the commands exactly as above, and every expected result matched. Nothing has been tried on a real phone or in real Safari. Audit by `slice-auditor`: **passed.** It ran the setup and all 9 steps on the deployed site in Chromium, logged in as the admin, with the commands in a plain PowerShell under this computer's default policy, and every result matched. It measured the glow as visible for about 0.75 seconds, including its fades, starting 0.12 to 0.23 seconds after the tap. The card's colour and text stayed the same, and only the tapped card's edge changed. Its screens were pixel-identical to the images linked here. Its main catch was that step 7 didn't name the `+20`, which a reviewer told to expect 30 could read as a bug. That's fixed, as are the `npm` commands in this section, the route in step 8, the delay before the glow, and a headline of 243 that was inferred, which is now a real full run. It again said `AGENTS.md` lacks `pick`, which is wrong. No second audit ran after these edits, which change only this file. It left completed Repte1 and Repte2 duels, and balances that the `fund 100` in section 2 resets.

## 6. Known limitations

- **The second player's first tap is final, and they can't know they're second.** This follows from revealing the moment both have picked, and the panel says so without saying who has picked. The cards are now 14px apart, as you chose, so a mis-tap on that tap is more likely, and it can't be undone. The design had kept the buttons well apart for this reason.
- **Someone watching a player tap sees the tap,** and now the two cards are different colours, so which one they tap is easier to see from a distance. The app hides the state afterwards, not the moment itself, as the design says.
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

- Verdict: changes
- Date: 2026-11-07
- Notes: make the glow last 0.7 seconds, not 2; I prefer only the external border of the card glows, not the whole card. I also prefer how the cards look in the results screen mor than in the selection screen, with its rounded colors, backgroun and so on; please, make the ones in the selection screen look more similar to the ones in the result page.
  1. Make the glow last 0.7 seconds, not 2.
  2. Only the external border of the card glows, not the whole card.
  3. Make the cards in the selection screen look more similar to the ones in the result page, with their rounded colours, background and so on.

### Round 2

- Verdict: approve
- Date: 2026-11-07
- Notes: None.
