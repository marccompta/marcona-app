# Slice 007 review

## 1. What to look at

**La minoria**, a group game for 3 or more players, now sits next to Confia o traeix in the admin's event types:

1. You create it and invite people, as with a duel. Unlike a duel, it doesn't start by itself: once at least 3 people are in, you tap **Comença el joc**. Anyone who still hasn't answered then misses out and isn't charged.
2. Everyone secretly picks one of two options, **Blanc** or **Negre**, and confirms it. A confirmed choice can't change. Everyone sees who has picked, never what.
3. When the last person picks, the smaller side splits the whole pot. A tie, or everyone picking the same, gives everyone their buy-in back.
4. **Administració** has a new **La minoria** form, where you can switch the game off, change its description and rename the two options. New games use the new names, and games already running keep theirs.

The questions for you: **does a whole game feel clear on a phone, from creating it to the result? Is it clear who has picked, and that a choice is final? Does renaming the options behave as you'd expect?** It takes about 10 minutes, with your phone and a terminal. The terminal plays `demo-nuria` and `demo-pau`, so you play the third seat.

Three things need more players than the demo accounts allow, so tests cover them instead, as listed in section 5: a remainder when the pot doesn't split evenly, a tie, and invitations lapsing when you start.

## 2. Before you start

- **You need:** your phone, your admin login, and a PowerShell terminal in `C:\Repos\marcona-app`. Your login is `MARCONA_ADMIN_USERNAME` and `MARCONA_ADMIN_PASSWORD` in the gitignored `.env.test.local`. The commands say `npm.cmd`, because plain `npm` and `npx` are blocked by this computer's PowerShell script policy.
- **Setup:**
  1. Run this, which cancels every open event and sets you, `demo-nuria` and `demo-pau` to exactly 100 marcones. **Your own balance is overwritten**, whatever it was, as in earlier reviews:

     ```powershell
     npm.cmd run demo -- fund 100
     ```

     It ends by listing each of those three accounts with `: 100`, in any order. It may first print `cancelled ...` lines for events left open by earlier rehearsals.
  2. Open https://marccompta.github.io/marcona-app/ on your phone, reload so you get the new version, and log in. This slice's branch is what's deployed there. In **Administració**, scroll down to **Jocs**, which now has two forms, **Confia o traeix** and then **La minoria**. In the La minoria form, **Joc actiu** is ticked, and **Primera opció** and **Segona opció** say **Blanc** and **Negre**. If they say anything else, set them back to Blanc and Negre and tap that form's **Desa el joc**.
- **Other people's balances stay as they are.** Nothing here touches real players.
- **Earlier rehearsals.** Claude and an independent check ran these steps first, so **Passats** already holds several events called Minoria, Segona and Tercera, some of them **Cancel·lat**. Lists show the newest first, so yours are always the top one of that name.
- **Reset afterwards:** step 12 sets the option names back to Blanc and Negre. Everything else is demo data. Slice 008 adds a wipe, run before the real night, that deletes every account but yours, along with all events and movements.

## 3. How to review

In each step with a command, run it and then just watch the phone: don't reload or tap anything until the step says so. In Claude's runs, each change reached the phone within 2.4 seconds of the command finishing, so give it a couple of seconds before deciding something didn't happen.

**A game, from start to result**

1. **Create it.** Tap **Esdeveniments**, then **Nou esdeveniment**. Set **Tipus** to **La minoria**. With **Hi jugo** ticked, the hint says **Almenys 2 persones: amb tu, sou 3.** Untick it, and it says **Almenys 3 persones.** Tick it again. Fill in **Nom** `Minoria` and **Entrada** `10`, tick `demo-nuria` and `demo-pau`, and leave **Participació obligatòria** unticked, as in [1-form.png](evidence/screens/1-form.png). Tap **Crea l'esdeveniment**.

   The game's screen opens, as in [1-created-top.png](evidence/screens/1-created-top.png): **Pot** 10 marcones, and under **Com funciona**, the line **Les opcions són Blanc i Negre.** above three rules. Scroll down to the bottom, as in [1-created.png](evidence/screens/1-created.png): you're **Hi participa** with the crown, both demo players are **Pendent**, and **Ja hi ha 1 persona a dins. En calen almenys 3 per començar.** sits above a dimmed **Comença el joc** button that does nothing yet.
2. **Fill it.** Run:

   ```powershell
   npm.cmd run demo -- accept Minoria demo-nuria
   ```

   It prints `demo-nuria accepted Minoria`. The phone changes to **Ja hi ha 2 persones a dins...**, and the button stays dimmed. Then run:

   ```powershell
   npm.cmd run demo -- accept Minoria demo-pau
   ```

   It prints `demo-pau accepted Minoria`. **Pot** becomes 30 marcones, the hint becomes **Ja hi ha 3 persones a dins. Si comences, les invitacions pendents caduquen.**, and **Comença el joc** lights up, as in [2-ready.png](evidence/screens/2-ready.png).
3. **Start it.** Tap **Comença el joc**. The screen now says **Cadascú tria en secret. Quan tothom hagi triat, es revela tot.**, with a **Tria en privat** button, and all three of you show **Triant**, as in [3-started.png](evidence/screens/3-started.png).
4. **Someone picks.** Run:

   ```powershell
   npm.cmd run demo -- pick Minoria Blanc demo-nuria
   ```

   It prints `demo-nuria picked Blanc`. Within about 2 seconds, `demo-nuria` turns to **Ha triat**, and nothing says what she chose, as in [4-nuria-locked.png](evidence/screens/4-nuria-locked.png).
5. **A choice is final.** Run:

   ```powershell
   npm.cmd run demo -- pick Minoria Negre demo-nuria
   ```

   After npm's usual two `>` lines, it prints `choice_locked`, the server's refusal, and the command fails. Nothing changes on the phone.
6. **Your pick.** Tap **Tria en privat**. A private panel shows two cards, **Blanc** and **Negre**, with **Tria una opció i confirma-la. Un cop confirmada, no es pot canviar.** Tap **Negre**: it gets a gold border, and the button below reads **CONFIRMA: NEGRE**, as in [6-panel.png](evidence/screens/6-panel.png). Nothing is sent until you confirm, so you could still tap Blanc instead. Tap **Confirma: Negre**. The cards go, and the panel says **La teva tria: Negre. Ja no es pot canviar.**, as in [6-confirmed.png](evidence/screens/6-confirmed.png). Tap **Tanca**. You now show **Ha triat** too.
7. **The reveal.** Run:

   ```powershell
   npm.cmd run demo -- pick Minoria Blanc demo-pau
   ```

   It prints `demo-pau picked Blanc, and the game is revealed`. Within a second the reveal starts with **Es compten les tries…**, and about 3 seconds later it reads **Guanya Negre** and **1 contra 2. El bàndol més petit es reparteix el pot.** The cards show 2 for Blanc and 1 for Negre, under a celebration of **+20** for you: 30 won, less your 10 buy-in, which fades after a few seconds. Below: you, **Negre**, **30 marcones**, and both demo players, **Blanc**, **0 marcones**, as in [7-reveal.png](evidence/screens/7-reveal.png).

**Forcing, and renaming the options**

8. **A forced game starts at once.** Create another La minoria the same way, with **Nom** `Segona`, **Entrada** `10`, `demo-nuria` and `demo-pau` ticked and **Hi jugo** kept, but this time tick **Participació obligatòria**. Tap **Crea l'esdeveniment**. It opens straight on the choosing, with no start step: **Pot** 30 marcones, **Les opcions són Blanc i Negre.**, all three **Triant**, and a **Tria en privat** button, as in [8-forced.png](evidence/screens/8-forced.png). Leave it open.
9. **Rename.** Tap **Administració** and scroll to the **La minoria** form. Change **Primera opció** to `Cara` and **Segona opció** to `Creu`, and tap that form's **Desa el joc**. It confirms **S'han desat els canvis del joc per als nous esdeveniments.**, as in [9-settings.png](evidence/screens/9-settings.png). A name can't be longer than 20 characters, and the field stops you there.
10. **The running game keeps its names.** Tap **Esdeveniments**, then **Segona** under **Oberts**. Its rules still say **Les opcions són Blanc i Negre.** Run:

    ```powershell
    npm.cmd run demo -- pick Segona Blanc
    ```

    It prints `demo-pau picked Blanc` and `demo-nuria picked Blanc`, in either order, and within a couple of seconds both show **Ha triat**. Tap **Tria en privat**: the cards still say **Blanc** and **Negre**, as in [10-running.png](evidence/screens/10-running.png). Pick **Blanc** and confirm. As you're the last to pick, the panel closes by itself, and about 3 seconds later the result says **Tothom ha triat Blanc** and **Es retorna l'entrada a tothom.**, with 10 marcones back for each of you, as in [10-unanimous.png](evidence/screens/10-unanimous.png).
11. **A new game uses the new names.** Create a third, the same way as step 8: **Nom** `Tercera`, with **Participació obligatòria** ticked. Its rules say **Les opcions són Cara i Creu.**, as in [11-new-names.png](evidence/screens/11-new-names.png), and **Tria en privat** shows **Cara** and **Creu** cards. Tap **Tanca**. You don't need to play it: scroll down, tap **Cancel·la l'esdeveniment**, then **Sí, cancel·la**. It shows **Cancel·lat**, and everyone's buy-in comes back.

    On **Classificació** you now have 120, and `demo-nuria` and `demo-pau` have 90 each.
12. **Reset.** In **Administració**, set the La minoria form's options back to `Blanc` and `Negre`, and tap that form's **Desa el joc**.

## 4. Checklist

| # | Requirement | Check | Expected result |
|---|---|---|---|
| 1 | REQ-155, REQ-185 | Step 1 | La minoria is offered, and the hint counts you towards 3 only while **Hi jugo** is ticked |
| 2 | REQ-156, REQ-157 | Steps 1 to 3 | **Comença el joc** stays dimmed until 3 are in, then starts the game. Nobody else is offered it, and the server refuses anyone else, which tests check |
| 3 | REQ-158 | Section 5 | A pending invitation lapses at the start, unpaid. The demo accounts can't show this, so tests check it |
| 4 | REQ-193 | Steps 6 and 10 | Two options, Blanc and Negre at first, picked in private and confirmed |
| 5 | REQ-197 | Steps 4, 6 and 10 | Everyone sees **Ha triat** when someone picks, never the choice |
| 6 | REQ-205 | Steps 5 and 6 | A second pick is refused, and your own panel only shows your choice once confirmed |
| 7 | REQ-161 | Step 7 | The smaller side, you alone, takes the whole pot of 30 |
| 8 | REQ-162 | Section 5 | A remainder goes to whoever on the smaller side picked first. It needs 7 players, so tests check it |
| 9 | REQ-163 | Step 10 | Everyone picking the same gives everyone their buy-in back. A tie needs an even number of players, so tests check that |
| 10 | REQ-160 | Steps 9 to 11 | After a rename, the game already running keeps Blanc and Negre, and a new one uses Cara and Creu |
| 11 | REQ-192 | Steps 8 and 11 | A forced game charges everyone and opens straight on the choosing |

## 5. Already checked automatically

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test` | 17 files, 126 passed |
| Browser tests, phone-sized, Chromium and WebKit | `npm run test:e2e` | 560 passed, 3 failed, 1 skipped. All 3 failures are older WebKit duel tests this slice doesn't touch: 2 passed when rerun, and the slow-connection tap test fails in about half of WebKit runs on `main` too, so it went to the backlog as REQ-215. The skip is a Chromium-only check |
| Smoke tests on the real project, both engines | `npm run test:e2e -- tests/e2e/smoke.spec.ts` | The new La minoria game passed on both engines in both full runs after its first draft was fixed, which locked in before the start had reached the server. The duel passed in every run. The Realtime test's audit check failed in Chromium in all 5 full runs, with or without this slice's test, and the roulette test's audit check in 3. Both pass when run alone, so this went to the backlog as REQ-214: a test account's audit now reads about 8,500 test movements |
| Hosted tests on the real project | `npm run test:hosted` | 10 files, 182 passed |
| La minoria's rules, payouts and labels | `tests/sql/minoria.sql` through `execute_sql` | 66 entries, all passed, after the last migration. Among them, the things the steps can't show: 7 players at 5 each, where the first of the smaller 3 to pick gets 13 and the others 11 (REQ-162); a 2 against 2 tie refunding everyone (REQ-163); an unanswered invitation lapsing unpaid at the start (REQ-158); 3 players starting with an admin who isn't playing, and 2 not being enough (REQ-185, REQ-157); and a player trying to start it (REQ-157) |
| Game rules and duel payouts, as `set_game_settings()` changed | `tests/sql/games.sql` through `execute_sql` | Every entry passed |
| Owner-only constraints | `tests/sql/constraints.sql` through `execute_sql` | 19 entries, all rejected |
| Deliberate breaks | Sending the old labels, and removing the 20-character limit | Both compiled, and both were caught by the new browser tests |
| Security advisors | Supabase MCP `get_advisors` | Nothing new. The notices listed are the same as before this slice |
| Docs | `python scripts/check_docs.py` | Passed |

Instructions run as written: a script ran the setup and steps 1 to 12 on the deployed site, in Chromium at 360 by 740, logged in as the admin, with the commands run exactly as above in a PowerShell under this computer's default script policy. Every expected result matched, the page was never reloaded, and the browser logged no errors. Changes reached the page within 2.4 seconds of each command finishing. Earlier runs stopped partway on mistakes in the script, not the app. One of them stopped before renaming the options back, and the next game rightly used Cara and Creu, which is why the setup now checks the names. Nothing has been tried on a real phone.

Audit by `slice-auditor`: **passed in round 1.** It ran the setup and the steps as they were then, 1 to 11, on the deployed site in Chromium, with the commands in a restricted PowerShell. Every expected result matched, the slowest live change taking 2.2 seconds, and the reset worked. Its catches, all fixed above: no step showed a *running* game keeping its names after a rename, as the spec asks, so steps 8 to 11 now rename while a game is open; section 1 pointed to tests that section 5 didn't name; "the wipe" wasn't explained; the steps didn't say which of several same-named games, or which of the two **Desa el joc** buttons; step 1's "greyed-out" button is dimmed gold, and its hint is at the bottom; step 5 also prints npm's lines; step 10 didn't say the panel closes by itself; and three screenshots didn't show what their step cited. No second audit ran after these edits. The script reran every step as now written, and they matched.

## 6. Known limitations

- **La minoria is now on for the live site too.** The last migration turned it on, and the database is shared, so the version on `main` offers it to the admin as well. That version can't start or play it, so don't create one there before this slice is merged.
- **Slice 008's wipe will end this slice's smoke test too.** Slice 008's design lists the game tests that play the demo accounts, which a wipe removes. The new La minoria smoke test is another, and slice 008 should account for it.
- **The demo script's refusal is terse.** In step 5 it prints the server's code, `choice_locked`, not a sentence. It's a review tool, not part of the app.
- **Two older test failures** are in the backlog as REQ-214 and REQ-215, described in section 5. Neither comes from this slice.

## 7. Your verdict

Type one of these in a Claude Code session started at the repo root:

- `/slice-verdict 007 approve`
- `/slice-verdict 007 changes <what to fix>`
- `/slice-verdict 007 reject <why>`

## Review log

### Round 1

- Verdict: approve
- Date: 2026-11-08
- Notes: None given.
