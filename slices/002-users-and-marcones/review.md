# Slice 002 review

## 1. What to look at

MarcOna now has people and money. As the admin you can create users, add or remove marcones, reset passwords and remove users. Everyone can see the ranking, anyone's movements and the audit, with chip stacks and numbers that count up.

Behind the screens are the rules every later slice relies on: an append-only ledger, balances that can't go below 0, double taps that apply once, and removal that takes effect immediately.

This should take about 10 minutes. You'll use your phone as the admin, and a computer as a player. What was agreed is in [spec.md](spec.md), and the work is in [tasks.md](tasks.md).

## 2. Before you start

- **You need:** your phone, a computer, and your admin username and password from `docs/setup.md`, step 7. The password stays with you, and it isn't in this file.
- **Setup:** None. Three demo players already exist: `demo-laia`, `demo-nuria` and `demo-pau`. You don't need to log in as them, but their password is in the chat message that handed you this review if you want to.
- **What's already in the audit:** rows for `claude-check`, `claude-check2` and `audit-check`. They're accounts used to rehearse these steps, and all of them are removed. Ignore them.
- **The username `rev-anna` works only once,** because usernames are never reused. If you stop partway, or review again after a `changes` verdict, use `rev-anna2` wherever these steps say `rev-anna`.
- **Reset afterwards:** Step 20 logs you out. The player you create is removed in step 14. Their rows stay in the audit, and their username stays taken, until the wipe, which slice 008 adds to delete test data.
- **Messages stay on screen.** A message on the Administració screen stays until you use that same form again, so an old one can sit next to a newer result. Go by the step you're on.

## 3. How to review

Open https://marccompta.github.io/marcona-app/. This slice's branch is what's deployed there, so `main` isn't live until the slice closes.

**On your phone, as the admin:**

1. Log in. You should see **Classificació**, as in [ranking.png](evidence/screens/ranking.png): `demo-laia` on 120, then `demo-nuria` and `demo-pau` on 45, in that order because they tie, then you on 0 with a **TU** pill. The first three have gold, silver and bronze diamonds as medals. The chips should land one after another, and the numbers count up quickly. It should look like [direction-b.png](../001-foundation/evidence/directions/direction-b.png), the visual direction you chose in slice 001. That image has invented names and bigger balances, so its stacks are taller, and it says "jugadors" where the site says "persones".
2. Tap `demo-laia`. You should see 120 counting up, which is easiest to watch here, with a chip stack, and three movements, newest first: Correcció -10, Premi de prova +30 and Benvinguda +100, as in [user-detail.png](evidence/screens/user-detail.png). Each shows the balance after it.
3. Tap **Auditoria**. You should see every movement, newest first, each with who, the amount, the concept, the balance after and the time, as in [audit.png](evidence/screens/audit.png). Set **Persona** to `demo-laia`: only those three movements stay. Set it back to **Tothom**.
4. Tap **Administració**, as in [admin.png](evidence/screens/admin.png). In **Nou usuari**, enter the username `AB` with the password `prova-1234`, and tap **Crea l'usuari**. You should see "El nom d'usuari ha de tenir de 3 a 20 caràcters: lletres minúscules, números, guions o guions baixos." Try `anna!`, and the same message stays. Scroll down to **Usuaris**: neither name is there.
5. Enter the username `rev-anna` with the password `12345`, and tap **Crea l'usuari**. You should see "La contrasenya és massa curta." Scroll down: `rev-anna` isn't in **Usuaris**.
6. Change the password to `prova-1234`, and tap **Crea l'usuari**. You should see "S'ha creat rev-anna.". Scroll down: `rev-anna` is in **Usuaris** with 0 marcones. The list is alphabetical, so it's near the bottom.
7. Tap `rev-anna` to open it. You'll see the panel in [admin-user.png](evidence/screens/admin-user.png), which was taken on `demo-pau`, scrolled down. Enter **Quantitat** `10` and **Concepte** `Benvinguda`, and tap **Afegeix**. You should see "S'han afegit les marcones.", and the row should show 10 marcones.
8. Enter `4` and `Correcció`, and tap **Treu**. You should see "S'han tret les marcones.", and the row should show 6 marcones.
9. Try each of these, and check the row still shows 6 marcones:
   - `5` with an empty **Concepte**, then **Afegeix**: "Escriu un concepte."
   - `1.5` with the concept `Prova`, then **Afegeix**: "La quantitat ha de ser un nombre enter d'1 o més." If your keypad has no decimal key, skip this one. That's a good sign on its own, and a test covers it.
   - `0` with `Prova`, then **Afegeix**: the same message.
   - `7` with `Massa`, then **Treu**: "El saldo no té prou marcones."

**On your computer, as the player:**

10. Open the same address in a private window, and log in as `rev-anna` with `prova-1234`. You should see the ranking with the **TU** pill on `rev-anna`, and four tabs with no **Administració**. **Esdeveniments** and **Ruleta** still say "Aquesta pantalla arribarà aviat." Look through all four, and tap `rev-anna` in the ranking: nothing should offer to change a password.

**Reset the password, on your phone:**

11. Under `rev-anna`, enter **Contrasenya nova** `prova-5678`, and tap **Canvia la contrasenya**. You should see "S'ha canviat la contrasenya i s'han tancat les sessions."
12. On the computer, reload. You should land on the login screen. Try `prova-1234`: "El nom d'usuari o la contrasenya no són correctes." Then log in with `prova-5678`, which should work.

**Remove the user, on your phone:**

13. Under `rev-anna`, tap **Elimina l'usuari**. You should see "Segur que vols eliminar rev-anna? No es podrà desfer.", as in [admin-remove.png](evidence/screens/admin-remove.png), which was taken on `demo-pau`, and nothing has happened yet. Tap **No, cancel·la**. `rev-anna` should still be there.
14. Tap **Elimina l'usuari** again, then **Sí, elimina**. The `rev-anna` row should disappear.
15. On the computer, reload. You should land on the login screen. Log in with `prova-5678`: "Aquest compte ja no està actiu."
16. On your phone, open **Classificació**: `rev-anna` shouldn't be there. Open **Auditoria**, and set **Persona** to `rev-anna (de baixa)`: their Correcció and Benvinguda are still there.
17. In **Administració**, create `rev-anna` again with `prova-1234`. You should see "Aquest nom d'usuari ja existeix o ja s'ha fet servir."
18. Tap your own name, then **Elimina l'usuari**, then **Sí, elimina**. You should see "No pots eliminar el teu propi compte."

**On your computer, in a terminal at the repo root:**

19. Run these to see where the app touches the secret key. This slice isn't on `main` yet, so the first two lines fetch its branch. You should see exactly one line, in `supabase/functions/admin-users/index.ts`, which reads the key from an environment variable that Supabase provides. The browser code never mentions it. That the repo holds no key at all is what the secret scan in section 5 checks.

    ```
    git fetch
    git switch slice/002-users-and-marcones
    git grep -n "SUPABASE_SECRET_KEYS" -- src supabase
    ```

20. On your phone, tap **Surt**. You should return to the login screen.

## 4. Checklist

"Automatic" means section 5 already covers it, so you only need to read the result. To see which tests cover a requirement, run `git grep -n "REQ-057" -- tests` with its ID.

| # | Requirement | Check | Expected result |
|---|---|---|---|
| 1 | REQ-035 | Steps 6, 10 | The user is created with 0 marcones, and can log in |
| 2 | REQ-036 | Step 4 | Both bad usernames get a Catalan error, and no user is created |
| 3 | REQ-037 | Step 17 | A removed user's username is refused |
| 4 | REQ-038 | Step 5 | A short password gets a Catalan error, and no user is created |
| 5 | REQ-039, REQ-060 | Steps 7, 16 | The balance rises, and the ledger row shows the amount, the Concept and the balance after |
| 6 | REQ-040 | Step 8 | The balance falls |
| 7 | REQ-041, REQ-042 | Step 9 | No Concept, 0 and 1.5 each get a Catalan error, and nothing changes |
| 8 | REQ-043, REQ-061 | Step 9, plus automatic | The removal is refused, and a database constraint stops a negative balance |
| 9 | REQ-044, REQ-045 | Steps 11, 12 | The new password works, the old one doesn't, and the session ended |
| 10 | REQ-046 | Step 10 | A player has no password control anywhere |
| 11 | REQ-047 | Step 13 | Nothing happens until the second confirmation |
| 12 | REQ-048, REQ-049, REQ-050, REQ-051 | Steps 14, 15, 16 | They can't log in, their session ended, they leave the ranking, and their movements stay |
| 13 | REQ-052 | Step 18 | A Catalan error, and you're still there |
| 14 | REQ-053 | Automatic | A removed user's unexpired token reads nothing, and every function refuses it |
| 15 | REQ-054 | Step 19, plus automatic | User actions go through the Edge Function, and the secret scan finds no key |
| 16 | REQ-055 | Automatic | Players and people with no session are refused by every admin function |
| 17 | REQ-056 | Automatic | The database refuses a second admin |
| 18 | REQ-057 | Automatic | Of two removals of 6 from 10 at the same moment, one succeeds and 4 remain |
| 19 | REQ-058, REQ-059 | Automatic | Every direct write is refused, and the ledger can't be changed, even by the owner |
| 20 | REQ-062 | Automatic | Two sends with one request ID return the same result and apply once |
| 21 | REQ-063, REQ-064, REQ-065 | Step 1 | Highest first, ties alphabetical, medals on the top three |
| 22 | REQ-066 | Step 2 | The balance and every movement on that person |
| 23 | REQ-067, REQ-068, REQ-069 | Step 3 | All movements, newest first, with every field, and the filter works |
| 24 | REQ-070 | Steps 1, 2 | Chip stacks, and numbers that count up |

## 5. Already checked automatically

| Check | Command | Result |
|---|---|---|
| Unit tests, including the secret scan | `npm test` | 81 passed |
| Tests against the hosted project | `npm run test:hosted` | 54 passed |
| Browser tests at 360px, Chromium and WebKit, including 8 against the real project | `npm run test:e2e` | 134 passed |
| Build, including the type check | `npm run build` | Passed |
| Docs and traceability | `python scripts/check_docs.py` | Passed |
| Owner-level constraints | `tests/sql/constraints.sql`, through the Supabase MCP server | 7 of 7 rejected, see [constraint-checks.md](evidence/constraint-checks.md) |
| Supabase's security advisor, read through its MCP server | `get_advisors` | 3 notices, all expected: `admin_adjust` is callable by logged-in users, which it checks itself; `money_requests` has no policies, because nothing outside Postgres reads it; leaked password protection needs the Pro plan |
| CI and deploy of this branch | GitHub Actions | Passed |

**Do the tests catch mistakes?** The screens (tasks T8 to T11) were written before their tests, so as a mutation check, 13 behaviours were broken on purpose, one at a time. The tests caught 12. The one that survived was the double-tap lock, because the request ID still kept the money right. A test now covers the lock, and it catches that break too.

**Instructions run as written:** by Claude, on the deployed site, with one browser as the phone and another as the computer, using the account `claude-check2`. Steps 1 to 18 and 20 passed, and step 19 printed the one expected line. A first run with `claude-check` failed at steps 11 and 12 because of a mistake in Claude's script, not in the app. No real phone was used, so that's still your check.

**Audit by `slice-auditor`, an independent agent with no knowledge of the build:** it followed all 20 steps on the live site, and each gave the stated result. It failed this file on two text problems: step 19 didn't work from `main`, and a step number was wrong. It also listed smaller gaps. All of these were fixed in this file, and the branch was pushed. No second audit ran on the corrected text. It didn't run the hosted tests, the browser tests, the constraint check or the advisor, so those results are Claude's alone. It re-ran `npm test`, the build and the docs check, which all passed.

## 6. Known limitations

- **A phone notices at its next load.** After a reset or a removal, an open screen stays as it is until that person reloads, or comes back to the tab. Live refresh is in slice 006.
- **A reset doesn't cut off an access token at once.** The session has ended and can't be renewed, and the app signs out at its next check, but a token copied out of the browser keeps working for up to an hour. Removal has no such gap, because every policy and function checks for it.
- **A removed user's table reads come back empty, rather than as an error.** That's how Row Level Security refuses rows. Function calls give a real error.
- **A refused money action isn't remembered.** Only a success is stored against its request ID, so resending a refused one tries it again.
- **Hosted test accounts pile up.** Each run of `npm run test:hosted` adds about 30 hidden accounts, which only the wipe clears, once slice 008 adds it. Nobody real ever sees them.
- **The constraint check isn't in `npm run test:hosted`,** because that command has no owner-level access. It needs running through the MCP server after any migration that touches these tables.
- **The Administració screen shows no removed users.** They appear only in the audit.
- **Old messages stay on the Administració screen,** and a removal shows no message of its own: the row just disappears. No requirement covers this. Say so in your verdict if you want it changed.
- **Passwords typed on the Administració screen are visible,** so you can read them out, and there's no second field to catch a typo.
- **You can reset your own password there.** It works, and it logs you out, and `.env.test.local` would then need updating.
- **One browser run failed once, unexplained.** All 4 real-project tests failed in Chromium in one full run. Its log was overwritten before it was read. The Auth logs show no rate limiting at that time, and the 6 full runs since have all passed.
- **Not tried on a real iPhone or Android.** WebKit is Safari's engine, but it isn't an iPhone. That includes the keypad in step 9, and a phone waking from sleep, where the session check was only simulated.

### Departures from the design

For `record.md` when the slice closes.

- **Task order:** T5 came straight after T1, because the money tests need a player account, which only T5 can create.
- **Test first:** T8 to T11 were written before their tests, against the workflow. The mutation check in section 5 is what was done about it. They also share files, so they landed in one commit.
- **T4:** it added only tests, because the grants from earlier migrations already reject direct writes.
- **`money_requests`:** it lives in the `private` schema rather than `public`, as nothing outside Postgres needs it.
- **`is_test`:** the design left its reach open. Only accounts made by automated tests have it, and the admin can't see them either. Demo users are ordinary accounts.
- **Session check, added:** the app now asks Auth to confirm the session on load and when the tab comes back. Without it, a phone would stay logged in for up to an hour after a reset, which wouldn't meet REQ-045.
- **`revoke_sessions()`, added:** it deletes `auth.sessions` rows, as the design's risk table expected, and only the secret key can call it. Hosted tests prove that the sessions end.
- **`rls_auto_enable()`:** it can no longer be called through the API, which clears the warning slice 001 left. The migration checks that its trigger still works.
- **`verify_jwt` is off for `admin-users`,** because Supabase's check doesn't understand the new keys. The function checks the token itself, and tests cover it.
- **From slice 001's follow-ups:** the **TU** pill, and a summary line under the title from direction B. The line says "persones" rather than "jugadors", following the glossary's advice on gendered nouns.
- **Migrations:** the first one, `active_users`, came back "confirmation expired" and then applied when it was sent again. It contains `drop` statements, which the Supabase server may hold for confirmation. Claude can't tell whether anyone confirmed it. The other migrations applied straight away.
- **`execute_sql` and `deploy_edge_function`:** they have `ask` rules, and each ran with no error. Claude can't tell whether a prompt appeared.

## 7. Your verdict

Type one of these in a Claude Code session started at the repo root:

- `/slice-verdict 002 approve`
- `/slice-verdict 002 changes <what to fix>`
- `/slice-verdict 002 reject <why>`

## Review log

### Round 1

- Verdict: pending
- Date:
- Notes:
