# Slice 008 review

## 1. What to look at

This slice gets the site ready for the real night, on 13 November:

1. **Administració** has a new **Dades** section at the bottom, with three panels:
   - **Export:** downloads everything as two files: every user, event and movement as JSON, and the movements as a CSV for a spreadsheet. Secret choices that haven't been revealed are never in them.
   - **Wipe:** **Esborra les dades de prova** deletes every account but yours, and every event and movement, and sets you to 0 marcones. Its button stays dimmed until you type `ESBORRA` exactly. It's the one thing allowed to delete movements.
   - **Lock:** **Bloqueig per a l'esdeveniment** closes the wipe for good, once the real data is in.
2. Two new documents: a [rehearsal checklist](https://github.com/marccompta/marcona-app/blob/slice/008-event-readiness/docs/rehearsal-checklist.md) of every money flow, to go through on real phones, and a one-page [day-of guide](https://github.com/marccompta/marcona-app/blob/slice/008-event-readiness/docs/day-of-guide.md) for the days before the event and the night itself.
3. The switch of the Supabase connector to read-only, for the freeze, has been tried. Section 5 has the result.

The questions for you: **do the export files reach your phone and open? Is the wipe hard enough to set off by accident? Does the guide cover what you'd need on the night? And does everything in the rehearsal checklist work on real phones?**

Parts A and B take about 15 minutes, with your phone. Part C, the rehearsal, takes about an hour, ideally with a friend and an iPhone and an Android. **Don't wipe or lock anything during this review.** The real wipe and the lock come after your verdict, in the order the guide gives.

## 2. Before you start

- **You need:** your phone, your admin login, and a computer to read the two documents. Your login is `MARCONA_ADMIN_USERNAME` and `MARCONA_ADMIN_PASSWORD` in the gitignored `.env.test.local`. For part C, a second phone, and a PowerShell terminal in `C:\Repos\marcona-app`. The commands say `npm.cmd`, because plain `npm` and `npx` are blocked by this computer's PowerShell script policy.
- **Setup:** open https://marccompta.github.io/marcona-app/ on your phone, reload so you get the new version, and log in. This slice's branch is what's deployed there.
- **Reset afterwards:** step 6 clears what you typed, and step 7 cancels the lock's question. Nothing in parts A and B changes any data. Part C makes rehearsal data, which the real wipe removes after your verdict, so no reset is needed there.

## 3. How to review

**Part A: on your phone**

1. **Find it.** Tap **Administració** and scroll to the very bottom, past the users. Under **Dades** there are three panels: **Prepara l'exportació**, **Esborra les dades de prova** with a field and a dimmed **Esborra-ho tot**, and **Bloqueig per a l'esdeveniment** with **Bloqueja l'esborrat**, as in [1-dades.png](evidence/screens/1-dades.png).
2. **Prepare the export.** Tap **Prepara l'exportació**. Within a few seconds it says **Ja pots baixar els fitxers.**, with two buttons below, **Baixa-ho tot (JSON)** and **Baixa els moviments (CSV)**, as in [2-export-ready.png](evidence/screens/2-export-ready.png). In Claude's runs it took between 1.4 and 1.9 seconds.
3. **Download everything.** Tap **Baixa-ho tot (JSON)**. Your phone saves a file called `marcona-` followed by today's date and the time, such as `marcona-2026-11-09-2204.json`. Your phone may ask first. With all the test data it's about 7 MB. **Note where your phone put it**, for example **Fitxers** › **Baixades** on an iPhone.
4. **Download the movements.** Tap **Baixa els moviments (CSV)**. It saves `marcona-moviments-` with the same date and time, about 1.4 MB. Open it in a spreadsheet app, such as Numbers, Google Sheets or Excel. The first row reads `id`, `data`, `usuari`, `canvi`, `saldo_despres`, `tipus`, `concepte`, `esdeveniment`, `qui`, `detalls`, and there's one row per movement, about 12,000 of them. Accents are intact: search for `Correcció`, a concept the tests use.
5. **A wrong word does nothing.** In **Escriu ESBORRA per confirmar**, type `esborra` in lower case. **Esborra-ho tot** stays dimmed, as in [3-wrong-word.png](evidence/screens/3-wrong-word.png), and tapping it does nothing.
6. **The right word.** Change it to `ESBORRA` in capitals. **Esborra-ho tot** lights up red, as in [4-right-word.png](evidence/screens/4-right-word.png). **Don't tap it.** Your keyboard's Go or Enter key does nothing here, as only the button wipes. Clear the field, and the button dims again.
7. **The lock asks first.** Tap **Bloqueja l'esborrat**. It asks **Segur? No es podrà desbloquejar.**, with **Sí, bloqueja** and **No, cancel·la**, as in [5-lock-question.png](evidence/screens/5-lock-question.png). **Tap No, cancel·la.** The question goes, and **Bloqueja l'esborrat** is back.

**Part B: the documents**

8. **The day-of guide.** Open the [day-of guide](https://github.com/marccompta/marcona-app/blob/slice/008-event-readiness/docs/day-of-guide.md) on your computer or phone. Check that:
   - its dates are right: rehearse until 11 November, the freeze and the awake check on 12 November, and the event on 13 November;
   - the 10 steps before the event come in the order you'd do them: rehearse, make `main` live, export, wipe, change your password, delete `.env.test.local`, create the real accounts, set the starting balances, lock the wipe, check the settings;
   - **If something goes wrong on the day** tells you what to do about a player locked out, a game or event stuck, and the site down;
   - it fits what you'd actually do on the night. Anything missing or wrong is a change to ask for.
9. **The rehearsal checklist.** Open the [rehearsal checklist](https://github.com/marccompta/marcona-app/blob/slice/008-event-readiness/docs/rehearsal-checklist.md) and skim it. It has nine sections, from the site and the admin's marcones through classic events, Ruleta, both games, live updates and accounts, to the export. Each row has a box for the iPhone and one for the Android.

**Part C: the rehearsal on real phones**

10. Follow the rehearsal checklist from **Before you start** to the end, on an iPhone and, if you have one, an Android. Its second step is this, which cancels every open event first:

    ```powershell
    npm.cmd run demo -- fund 100
    ```

    It ends by listing you, `demo-nuria` and `demo-pau` with `: 100`. **It sets your own balance to exactly 100**, whatever it was, adding or removing what's needed. The checklist then says which phone does what, and gives each demo command. Note each failure, with the phone and the row number. **Don't tap Esborra-ho tot in row 9.3.** If something fails, give the list in a `changes` verdict, and the fixes go in before the wipe. If everything works, approve.

## 4. Checklist

| # | Requirement | Check | Expected result |
|---|---|---|---|
| 1 | REQ-164 | Steps 2 to 4 | Both files download on your phone, with every user, event and movement. That unrevealed choices are left out is checked by tests, in section 5 |
| 2 | REQ-165 | Section 5, then after your verdict | Tests show the wipe leaves only you and the settings, at 0 marcones, and frees old usernames. The real wipe is step 4 of the guide, after your verdict |
| 3 | REQ-166 | Steps 5 and 6 | Without `ESBORRA` exactly, the button stays dimmed and nothing is sent. Tests check that the server refuses it too |
| 4 | REQ-167 | Section 5 | A player calling the export, the wipe or the lock directly is refused. Tests check this |
| 5 | REQ-168 | Step 7 | The lock asks first. Tests check that once locked, every wipe is refused, whatever word is typed |
| 6 | REQ-169 | Step 10 | Every row of the checklist works on an iPhone, and on an Android if you have one |
| 7 | REQ-170 | Step 8 | The guide covers a locked-out player, a stuck game and the site going down |
| 8 | REQ-171 | Step 8 | The guide sets the awake check for 12 November, and says how to do it. You do it that day |
| 9 | REQ-172 | Section 5, then step 2 of the guide | `main` is live now. Once this slice merges, the guide's step 2 checks again |
| 10 | REQ-173, REQ-174 | Step 8 and section 5 | The guide gives the freeze steps for 12 November, and the read-only switch was tried and works |

## 5. Already checked automatically

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test` | 20 files, 140 passed, including the CSV: quoting, accents, and text a spreadsheet would run as a formula |
| Browser tests, phone-sized, Chromium and WebKit | `npm run test:e2e` | 585 passed, 6 failed, 1 skipped. The 8 new tests for this slice passed in both engines, and failed when the word check or the lock check was removed on purpose. A ninth, added after the audit, failed until the keyboard's Enter key could no longer wipe, and the 9 now pass in both engines. Of the 6 failures, 3 were real logins that hit the Auth rate limit after many test runs, and 1 was a WebKit ranking test: all 4 passed when rerun. The other 2 are older WebKit duel tests this slice doesn't touch, and they fail on `main` too: REQ-215, already in the backlog, and the resting-screen test, now in the backlog as REQ-217. The skip is a Chromium-only check |
| Hosted tests on the real project | `npm run test:hosted` | 11 files, 186 passed, 2 failed. One hit the Auth rate limit. The other was this slice's own check ending with a full export, which ran past the database's 8-second limit while the other hosted files were loading the project. That check now reads one movement instead, and both files passed when rerun. The risk is logged as REQ-218. After the wipe the data is far smaller |
| The export, wipe and lock rules | `tests/sql/readiness.sql` through `execute_sql` | 16 entries, all passed. It wipes the real project inside a transaction and always rolls back. The wipe took 0.9 seconds. Among the entries: an unrevealed choice appears nowhere in the export; a player can't export, wipe or lock; four wrong words change nothing; after the wipe only you remain, at 0, with the settings and games unchanged; an old username can be used again; the ledger refuses deletes again as soon as the wipe returns; once locked, the right word is refused |
| Owner-only constraints | `tests/sql/constraints.sql` through `execute_sql` | 19 entries, all rejected, after the migration that changed the ledger's trigger |
| Read-only switch, REQ-174 | Claude, with `&read_only=true` in `.mcp.json` | The connector stayed connected. Reads and the table list worked. The migration, deploy and branch tools disappeared, SQL ran as `supabase_read_only_user` in a read-only transaction, and a write was refused. Read-only is off again |
| `main` is live, REQ-172 | `gh api` on the Pages deployments | Before this slice's review deploy, Pages served `main` at `17ba9e7`, and every earlier slice is merged into `main`. This review's deploy of the slice branch has since replaced it, as for every review |
| Security advisors | Supabase MCP server | No new kind of finding. The three new functions join the existing list of security definer functions that signed-in users can call, which is by design, as each checks for the admin first |
| Docs | `python scripts/check_docs.py` | Passed |

Instructions run as written: steps 1 to 7 by a script on the deployed site at phone size, as the admin, which took the screenshots and never tapped the wipe or the lock. Steps 8 and 9 by reading the documents. Step 10 can only be done on real phones, by you. The `npm.cmd` commands were run under PowerShell's restricted policy, `status` only, as `fund` changes data.

Audit by `slice-auditor`: it ran steps 1 to 7 on the deployed site with the wipe and lock calls blocked, and found every result as described. It failed the review on one safety problem, now fixed: with `ESBORRA` typed, the phone keyboard's Go or Enter key ran the wipe at once, as the wipe was a form. It's no longer a form, so only the button wipes, and a test proves Enter sends nothing. It also found that the checklist didn't say which phone plays whom, had one wrong rule about when a duel charges, left out the demo commands, and misdescribed `fund`, and that the advice for checking the wipe pointed at **Classificació**, which shows its empty state with only one account. All are fixed. No second audit ran.

## 6. Known limitations

- **No Edge Function.** The design planned the wipe in an Edge Function, because deleting Auth accounts was thought to need the secret key. The database owner can delete them directly, so the wipe is one database function, and everything goes in one transaction or not at all.
- **The real wipe has never run.** Deleting Auth accounts has only been tested inside transactions that roll back. The first real one is after your verdict. Afterwards, the user list in **Administració** should show only you, at 0, and **Classificació** its empty state. The guide's step 4 says so.
- **The wipe ends the automated tests on the real project, and `npm run demo`.** The demo players and test accounts are gone, and `.env.test.local` is deleted, so the hosted tests, the real-project browser tests and `npm run demo` stop for good. The browser tests against the fake, the unit tests and the SQL tests still run. A fix during the freeze relies on those.
- **Export from the home screen app on an iPhone is untested.** It works in the browser. Row 9.1 of the checklist checks it on your phone.
- **A large export can time out.** With about 12,000 test movements, it once took over 8 seconds while the project was busy. After the wipe there's far less data. Logged as REQ-218.
- **Only the database owner can undo the lock,** with SQL. That's on purpose.
- **REQ-171, REQ-173 and REQ-174 happen on 12 November,** after this slice closes. This slice delivers the steps and proves the read-only switch.
- **The checklist's commit** linked to the guide one commit before the guide existed, so the docs check fails at that one commit. It passes now.

## 7. Your verdict

Type one of these in a Claude Code session started at the repo root:

- `/slice-verdict 008 approve`
- `/slice-verdict 008 changes <what to fix>`
- `/slice-verdict 008 reject <why>`

## Review log

### Round 1

- Verdict: pending
- Date:
- Notes:
