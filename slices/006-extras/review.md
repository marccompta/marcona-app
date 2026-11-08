# Slice 006 review

## 1. What to look at

Three extras for the night itself:

1. **Live updates.** The ranking, a person's page, the audit, the events list and an event's screen now change by themselves when something happens on another phone, with no reload. A phone that was asleep or offline catches up when it wakes.
2. **A QR code.** **Administració** has a new **Codi QR per entrar** button. Friends scan the code it shows to open the site.
3. **Home screen install.** Added to the home screen, the site opens full screen as **MarcOna**, with a gold spade icon.

The questions for you: **do the screens keep up by themselves, quickly enough? Does the code open the site? Does the home screen app look and open like an app?** It takes about 10 minutes, with your phone and a terminal. A second phone helps with the QR code.

Secret picks aren't affected: a pick still sends nothing to anyone's phone until the reveal, and a test listens during a real duel to check this.

## 2. Before you start

- **You need:** your phone, your admin login, and a PowerShell terminal in `C:\Repos\marcona-app`. Your login is `MARCONA_ADMIN_USERNAME` and `MARCONA_ADMIN_PASSWORD` in the gitignored `.env.test.local`. An iPhone is best for step 10, as home screen apps differ most there. The commands say `npm.cmd`, because plain `npm` and `npx` are blocked by this computer's PowerShell script policy. The terminal plays the other phones.
- **Setup:** run this, which cancels every open event and sets you, `demo-nuria` and `demo-pau` to exactly 100 marcones. **Your own balance is overwritten**, whatever it was, as in earlier reviews:

  ```powershell
  npm.cmd run demo -- fund 100
  ```

  It ends by listing each of those three accounts with `: 100`, in any order. It may first print `cancelled ...` lines for events left open by earlier rehearsals.
- **Other people's balances stay as they are.** Real players, such as `ramon` and `nuria`, have their own balances, which nothing here touches. The steps only say where the demo players end up relative to each other.
- **Earlier rehearsals.** Claude and an independent check ran these steps first, so **Passats** already holds several events called Directe, Sorpresa and Final, some of them **Cancel·lat**. Yours will be the newest.
- **Reset afterwards:** Nothing to clean up. It's all demo data, which the wipe before the event removes. If you add the site to your home screen in step 10, you can keep it or delete it like any app.

## 3. How to review

Open https://marccompta.github.io/marcona-app/ on your phone, reload so you get the new version, and log in. This slice's branch is what's deployed there. In each step, run the command and then just watch the phone: don't reload or tap anything until the step says so.

**Live updates**

1. On **Classificació**, `demo-nuria`, `demo-pau` and you all show 100, as in [ranking-before.png](evidence/screens/ranking-before.png).
2. In the terminal:

   ```powershell
   npm.cmd run demo -- give demo-pau 25
   ```

   It prints `demo-pau: 125`. Within about two seconds, `demo-pau` counts up to **125** and moves above `demo-nuria`, as in [ranking-after.png](evidence/screens/ranking-after.png). In Claude's runs it took 1.2 to 1.4 seconds after the command finished.
3. **A person's page.** Tap `demo-pau`. Its page shows **125**. Then run:

   ```powershell
   npm.cmd run demo -- give demo-pau 5
   ```

   It prints `demo-pau: 130`. Within about two seconds the balance counts up to **130**, and a **Revisió en directe**, **+5** row appears at the top of its list, as in [person-after.png](evidence/screens/person-after.png).
4. Tap **Auditoria** in the bar at the bottom, wait a couple of seconds for it to load, then run:

   ```powershell
   npm.cmd run demo -- give demo-nuria 5
   ```

   It prints `demo-nuria: 105`. Within about two seconds a new row appears at the top: `demo-nuria`, **+5**, **Revisió en directe**, **Saldo: 105 marcones**, as in [audit-after.png](evidence/screens/audit-after.png).
5. **Asleep.** Lock your phone. Run the same command again:

   ```powershell
   npm.cmd run demo -- give demo-nuria 5
   ```

   It prints `demo-nuria: 110`. Wait about 10 seconds, then unlock the phone. Within a few seconds of the screen coming back, a second **Revisió en directe** row for `demo-nuria` is at the top, with **Saldo: 110 marcones**, and you didn't reload.
6. **Someone accepts.** Tap **Esdeveniments** in the bar at the bottom, then **Nou esdeveniment**. Leave **Tipus** as **Clàssic**, set **Nom** to `Directe` and **Entrada** to `5`, tick `demo-nuria`, and tap **Crea l'esdeveniment**. The event's screen shows `demo-nuria` as **Pendent** and the pot as **5 marcones**. Then run:

   ```powershell
   npm.cmd run demo -- accept Directe
   ```

   It prints `demo-nuria accepted Directe`. Within about two seconds `demo-nuria` changes to **Hi participa** and the pot to **10 marcones**, as in [event-after.png](evidence/screens/event-after.png).
7. **A new invitation.** Tap **‹ Esdeveniments** above the event's name, to go back to the list. Then run:

   ```powershell
   npm.cmd run demo -- invite Sorpresa 5
   ```

   It prints `demo-nuria invited` followed by your username and `to Sorpresa`. Within about two seconds **Sorpresa** appears under **Invitacions**, as in [list-invitation.png](evidence/screens/list-invitation.png). You don't need to answer it.
8. **An event finishes.** Tap **Nou esdeveniment**. Choose **Confia o traeix** under **Tipus**, set **Nom** to `Final` and **Entrada** to `10`, untick **Hi jugo**, tick `demo-nuria` and `demo-pau`, tick **Participació obligatòria**, and tap **Crea l'esdeveniment**. Then tap **‹ Esdeveniments** to go back to the list, where **Final** is under **Oberts**. Run:

   ```powershell
   npm.cmd run demo -- pick Final confia
   ```

   It prints a line for each demo player, the second ending `, and the duel is revealed`. Within about two seconds **Final** moves to the top of **Passats**, marked **Completat**, as in [list-finished.png](evidence/screens/list-finished.png). Tap it: the two cards turn and it ends as in [duel-revealed.png](evidence/screens/duel-revealed.png), with **Confiança mútua**, and each player gets what the rules on the screen say for both trusting, which is 15 marcones at the default 150%.

**The QR code**

9. Tap **Administració** in the bar at the bottom. **If the page opens part-way down, scroll up to the top.** This is an older quirk: every screen shares one scroll position, and the duel's reveal scrolled it. It's in the backlog as REQ-213. At the top is **Codi QR per entrar**, as in [admin-qr-link.png](evidence/screens/admin-qr-link.png). Tap it. A large black-on-white code fills the width, with the site's address under it, as in [qr.png](evidence/screens/qr.png). Point a second phone's camera at it. It offers `marccompta.github.io/marcona-app`, and opening that shows the login. With no second phone, open the same screen on this computer instead, log in as yourself, and scan the computer's screen with your phone.

**The home screen**

10. On your phone, open the site in its browser and add it to the home screen:
    - **iPhone, Safari:** tap the Share button, then **Add to Home Screen**. The name is already **MarcOna**, with the gold spade on green. Tap **Add**.
    - **Android, Chrome:** tap the ⋮ menu, then **Add to home screen** or **Install app**, and confirm.

    Open it from the home screen. It opens full screen: no address bar and no browser buttons, with the green table reaching the top of the screen. The icon looks like [icon-512.png](../../public/icons/icon-512.png). **On an iPhone you log in once more,** because the home screen app keeps its own login, separate from Safari's. Once you're in, it works like the site.

## 4. Checklist

| # | Requirement | Check | Expected result |
|---|---|---|---|
| 1 | REQ-150 | Step 2 | The ranking changes by itself within a few seconds |
| 2 | REQ-150, REQ-151 | Step 3 | A person's balance and movements change by themselves |
| 3 | REQ-151 | Step 4 | The new movement appears at the top of the audit by itself |
| 4 | REQ-150, REQ-151 | Step 5 | A change made while the phone was locked shows soon after it wakes |
| 5 | REQ-152 | Step 6 | Someone accepting shows on the event's screen by itself |
| 6 | REQ-152 | Step 7 | A new invitation appears in the list by itself |
| 7 | REQ-152 | Step 8 | A finished event moves to **Passats** by itself |
| 8 | REQ-153 | Step 9 | Scanning the code opens the site |
| 9 | REQ-154 | Step 10 | **Your judgement:** the home screen app has its own name and icon, and opens full screen |
| 10 | REQ-128, REQ-194 | Automated | A pick sends nothing to any phone, and the reveal does |
| 11 | Not a requirement | All of it, on an iPhone | It works in real Safari. Tests cover WebKit, Safari's engine, but not an iPhone |

## 5. Already checked automatically

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm.cmd test` | 124 passed |
| Browser tests, Chromium, local build | `npx.cmd playwright test --project=chromium` | 265 passed, including 9 on the real project, among them the live ranking and audit, a real duel, spins and an event |
| **Browser tests, WebKit, on this computer** | `npx.cmd playwright test --project=webkit` | **261 passed, 3 failed, 1 skipped.** Windows didn't block WebKit today. Two failures were tests reading a screen before it had loaded. Both are fixed and passed again. The third, a duel tap after both have picked, timed out once and passed on its own rerun. It isn't explained |
| Browser tests, WebKit and Chromium, on Linux in GitHub Actions | The `browsers` job in `.github/workflows/ci.yml` | First run: 510 passed, 19 skipped (tests that need the real project), and 1 failed: a roulette check that allows only half a second for a tap during the win celebration, in WebKit. Roulette has nothing live, and the test passed 6 times out of 6 here. A rerun of the failed job passed: 511 passed, 19 skipped |
| Hosted tests, on the real project | `npm.cmd run test:hosted` | 182 passed. The first full run had 1 failure, in a roulette test that logs a new account in. It passed on rerun, and I didn't keep its message |
| Database rules only the owner can test | `tests/sql/constraints.sql`, through the Supabase MCP server | All 19 rules say "rejected", including a new check that live updates cover exactly four tables and never the secret picks |
| Docs and traceability | `python scripts/check_docs.py` | Passed |
| Deliberate breaks | Throwaway scripts | I broke the code on purpose 17 times, each time checking it still built, and the tests caught 16. The one not caught is described in the next paragraph. Five earlier breaks didn't build, so they proved nothing and were redone. Two weren't caught at first, so that test was strengthened |

**A fix the tests can't prove.** By default, Supabase reports a phone as listening slightly before the database side is ready, and a change in that gap would be lost. The app now asks it to wait, and reads the screen once more as soon as it's really listening. The real-project test missed an audit row in 3 of about 5 runs before this, but it also passed 4 times out of 4 without the fix, so the reason for the fix is Supabase's own description of the gap, not the test. Removing it is the break the tests didn't catch.

**Three slice 005 tests changed.** Live updates now arrive before the 3-second check does, so one test of that check turns live updates off, one waits for the screen's first read before changing anything, and one reads the reveal's position once its scrolling has stopped.

Instructions run as written: a script ran the setup and steps 1 to 4 and 6 to 9 on the deployed site, in Chromium at 360 by 740, logged in as the admin, with the commands run exactly as above in a PowerShell under this computer's default script policy. Every expected result matched, and the page was never reloaded. Updates arrived 0.2 to 1.4 seconds after each command finished. Step 5 needs a phone to lock, and step 10 a real phone, so neither was run. Chromium read the install details with no errors. Nothing has been tried on a real phone.

Audit by `slice-auditor`: **failed in round 1, on the instructions, not the app.** It ran every step on the deployed site in Chromium, with the commands in a restricted PowerShell. Every live update behaved as described, taking 0.4 to 1.2 seconds. It decoded the QR code as the site's address, and opening that showed the login. It stood in for a locked phone by hiding, freezing and disconnecting the page, and the missed row appeared 0.9 seconds after it came back. Its catches, all fixed above:
- After the duel, **Administració** opened scrolled down, hiding the QR button. Step 9 now says to scroll up, and the cause is REQ-213 in the backlog.
- Two images were taken mid-fade. Both are retaken.
- Nothing checked a person's page, or an event finishing while the phone was on the list. Steps 3 and 8 now do.
- It flagged a dangling reference to the CI rerun, jargon, the missing warning that setup overwrites your balance, and an unclear back link.

No second audit ran after these edits. A script reran the changed steps on the deployed site, and they matched.

## 6. Known limitations

- **An iPhone home screen app keeps its own login.** Everyone who adds it logs in once more. This is how iOS works, and the design expected it.
- **No offline use and no notifications.** The home screen app needs a connection like the site, and there's no service worker, as the spec chose.
- **A duel's screen still also checks every 3 seconds,** as the spec asked, as a fallback. While your own tap is on its way or glowing, a live change waits for that check, so the reveal can't jump ahead of the glow.
- **Only these screens are live:** the ranking, a person's page, the audit, the events list and an event's screen. **Ruleta**'s balance and **Administració**'s list of users still update when you open them or act there. Nothing asked for more, so it's in the backlog as REQ-211, proposed.
- **A screen can open part-way down** if the last one was scrolled, as in step 9. This predates the slice, and it's REQ-213, proposed.
- **The test accounts' audit is long.** It includes every automated test's movement so far, and it took WebKit over 5 seconds to load. Real players don't see test accounts, so this doesn't affect them, and the wipe before the event clears it.

## 7. Your verdict

Type one of these in a Claude Code session started at the repo root:

- `/slice-verdict 006 approve`
- `/slice-verdict 006 changes <what to fix>`
- `/slice-verdict 006 reject <why>`

## Review log

### Round 1

- Verdict: approve
- Date: 2026-11-08
- Notes: None.
