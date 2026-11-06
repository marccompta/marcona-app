# Slice 001 review

## 1. What to look at

MarcOna is live at its public address, in "Saló privat", the visual direction you chose (direction B). You can log in with your admin account, stay logged in, log out, and see the styled, empty ranking in Catalan. The bottom tabs work, but the screens behind them are placeholders until later slices.

This should take 5 to 10 minutes on your phone.

## 2. Before you start

- **You need:** your phone, a computer, and the admin username and password you created in `docs/setup.md`, step 7. The password stays with you, and it isn't in this file.
- **Setup:** None.
- **Reset afterwards:** Log out on each device, as in steps 8 and 9.

## 3. How to review

**On your phone, ideally in a dim room:**

1. Open https://marccompta.github.io/marcona-app/. You should see the login screen: the gold ♠ MarcOna logo inside a double gold frame, with two fields and a gold **Entra** button. Compare it with [login.png](evidence/screens/login.png).
2. Enter your username and a wrong password, then tap **Entra**. You should stay on the login screen and see "El nom d'usuari o la contrasenya no són correctes.", as in [login-error.png](evidence/screens/login-error.png).
3. Enter the right password and tap **Entra**. You should see **Classificació** with "La taula està buida", as in [ranking.png](evidence/screens/ranking.png). No email address should appear anywhere.
4. Tap each of the five tabs. Apart from **Classificació**, the other four (**Esdeveniments**, **Ruleta**, **Auditoria** and **Administració**) should each show its title and "Aquesta pantalla arribarà aviat.", as in [placeholder.png](evidence/screens/placeholder.png).
5. On any tab, reload the page. You should stay logged in, on that same screen.
6. Look at the top and bottom edges. Nothing should sit under the notch or the home bar, and nothing should scroll sideways.
7. Open your [Casino Tokens artifact](https://claude.ai/artifact/F4JoKy6K6LLs7RUFoUwBX7) and compare. You should recognise the colours and the logo, and the site should feel premium and be comfortable to read. Cards and tags can't be compared yet: see section 6. Every word you've seen should be natural Catalan.
8. Tap **Surt**, at the top right. You should return to the login screen, and a reload should leave you there.

**On a computer:**

9. Open the same address in a desktop browser and log in. You should see a centred column rather than a stretched page, as in [desktop.png](evidence/screens/desktop.png). Then click **Surt**.

**The directions you chose from:**

10. Compare [direction-a.png](evidence/directions/direction-a.png), [direction-b.png](evidence/directions/direction-b.png) and [direction-c.png](evidence/directions/direction-c.png). The site should match B. The chip stacks in B arrive with the player list in slice 002.

**Docs, if you want to spot-check them:**

11. Open `docs/setup.md`: every step you did by hand should be there. Open `docs/tooling.md`: each tool should have a clear job, and a note on how its install command was checked. Open `.mcp.json`: the Supabase URL should end in `project_ref=ndkgmenntqhjojalqbdm`. Open `.claude/settings.json`: `ask` should list eight Supabase tools, with `apply_migration` left out.

## 4. Checklist

"Automatic" means section 5 already covers it, so you only need to read the result.

| # | Requirement | Check | Expected result |
|---|---|---|---|
| 1 | REQ-001, REQ-002 | Steps 1, 5 | The site loads, and a reload keeps the screen |
| 2 | REQ-003, REQ-004 | Step 3 | You see the ranking, and no email appears |
| 3 | REQ-005, REQ-019 | Step 2 | You stay on login, with a Catalan error |
| 4 | REQ-006, REQ-007 | Steps 5, 8 | You stay logged in, then log out |
| 5 | REQ-008, REQ-009 | Automatic | No rows without a login, and the RLS report is empty |
| 6 | REQ-010 | Automatic | Public sign-up is rejected |
| 7 | REQ-011, REQ-012 | Steps 3, 4, plus automatic | A styled empty state. The screens are too short to scroll, so a test proves the tab bar stays put |
| 8 | REQ-013 | Step 4, plus automatic | You see Administració. A player doesn't, tested with a fake player only |
| 9 | REQ-014, REQ-015, REQ-018 | Step 7, plus automatic | Every word is natural Catalan. Tests check `lang="ca"` and that all wording is in one module |
| 10 | REQ-016, REQ-017 | Automatic | "1.234 marcones", "1 marcona" and a ca-ES date in Madrid time |
| 11 | REQ-020, REQ-021, REQ-026 | Step 7 | It's recognisably "Casino Tokens", premium and readable. No cards or tags are on screen yet, see section 6 |
| 12 | REQ-022 | Automatic | Every font comes from the site itself |
| 13 | REQ-023, REQ-024 | Step 6, plus automatic | Nothing scrolls sideways, and targets are at least 44px |
| 14 | REQ-025, REQ-027 | Steps 6, 9 | Clear of the notch and home bar, and usable on a desktop |
| 15 | REQ-028 | Step 10 | Three directions were shown, and the site matches B |
| 16 | REQ-029, REQ-030, REQ-206 | Step 11, plus automatic | Tools and setup are written down, Supabase MCP is scoped to this project, and migrations need no manual approval |
| 17 | REQ-031 | Automatic | The secret scan finds nothing |
| 18 | REQ-032 | Automatic | [supabase-checks.md](evidence/supabase-checks.md) shows the repo's two migrations are the two applied. Section 6 lists what's outside them |
| 19 | REQ-033 | Step 1 | The public site shows this slice, and the latest **Deploy** run for `slice/001-foundation` at https://github.com/marccompta/marcona-app/actions is green |

## 5. Already checked automatically

You don't need to rerun these. To do so, use Git Bash at the repo root, after `npm ci` and `npx playwright install chromium webkit`. With `.env.test.local` present (`docs/setup.md`, step 7), each browser run also makes 2 real logins and 2 wrong-password attempts on the live project.

| Check | Command | Result |
|---|---|---|
| Unit tests, including the secret scan | `npm test` | 48 passed |
| Hosted project tests | `npm run test:hosted` | 9 passed |
| Browser tests at 360px, on a local build | `npm run test:e2e` | 50 passed |
| Browser tests on the deployed site | `E2E_BASE_URL=https://marccompta.github.io/marcona-app/ npm run test:e2e` | 50 passed |
| Build, including the type check | `npm run build` | Passed, locally and in the deploy workflow |
| Docs | `python scripts/check_docs.py` | Passed, locally and in CI |
| CI and deploy on GitHub | Run by pushing this branch | Both passed |
| Migrations and security advisor | Through the Supabase MCP server | Migration names and versions match. 3 warnings, no errors, see section 6 |

The browser tests are 25 tests, each run in Chromium and in WebKit, Safari's engine. Of the 25, 18 use a fake Supabase, so they can test cases the real project can't produce on demand. Another 5 need no backend, and 2 use the real project. The hosted tests and those 2 browser tests need `.env.test.local`. Without it, a browser run shows 46 passed and 4 skipped.

Instructions run as written: steps 1 to 5, 8 and 9 in scripted browsers, by Claude and `slice-auditor`. Steps 10 and 11 were read rather than run. Steps 6 and 7 need your eyes on a real phone. Audit by `slice-auditor`: two passes, both failing this document, with no failed tests. Their findings are fixed here. No third `slice-auditor` pass has been run, but Claude re-read this document against the repo at your request: every link resolves, and the app hasn't changed since the screenshots were taken.

## 6. Known limitations

- **Two migrations ran with no prompt:** `profiles` and `admin_profile` reached the live database in auto mode, while REQ-034 still required your manual approval. The changes match the repo. You've since decided that auto mode can stay on and migrations don't need your approval, so REQ-206 replaces REQ-034, and ADR 0007 replaces ADR 0002. Eight other Supabase tools keep their `ask` rules. A prompt appeared with auto mode off, but whether the rules hold in auto mode is untested.
- **No cards or tags on screen yet (REQ-020):** the spec lists rounded cards and pill tags. Direction B swaps cards for ledger rows, and its one pill, "tu", arrives with the player list in slice 002. Say so in your verdict if you want cards kept.
- **Real iPhone not tested:** the tests run Safari's engine, but with phone emulation on Windows. The real notch, home bar and Safari itself are only checked by you, in steps 1 to 8.
- **Real player not tested:** no one can create players until slice 002, so hiding Administració from a player is tested only with a fake one.
- **Empty ranking:** it shows the empty state whoever exists, because the player list arrives in slice 002.
- **Placeholder screens:** Esdeveniments, Ruleta, Auditoria and Administració hold no features yet.
- **Leaked password protection is off:** this warning from Supabase's security advisor can't be cleared, because the feature needs the paid Pro plan. Choose strong passwords for accounts.
- **Other advisor warnings:** two are about `rls_auto_enable()`, a Supabase trigger that turns on Row Level Security (RLS, the database's per-row access rules) for new tables. It stays. The details are in [supabase-checks.md](evidence/supabase-checks.md).
- **Not in `supabase/migrations/`:** that function and its `ensure_rls` trigger, your hand-made Auth user, and the Auth settings. Only the migration names and versions were compared, not the applied SQL.
- **Settings not read back:** "Require current password when updating" and the sign-in rate limit can't be checked from outside. They rest on your confirmation during setup.
- **One shared site:** `main` and slice branches deploy to the same address, and the last push wins.
- **Tests that CI doesn't run:** hosted tests need `.env.test.local`, so they run only from this machine. Browser tests aren't in CI either. CI runs the docs check, unit tests and build.

## 7. Your verdict

Type one of these in a Claude Code session started at the repo root:

- `/slice-verdict 001 approve`
- `/slice-verdict 001 changes <what to fix>`
- `/slice-verdict 001 reject <why>`

**Approving closes the slice straight away.** This project is in fast lane with auto-push on, so `approve` carries on to `/slice-close` with no further stop, and merges the slice into `main` and pushes it.

## Review log

### Round 1

- Verdict: pending
- Date:
- Notes:
