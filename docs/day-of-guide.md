# Day-of guide

One page for MarcOna, on **13 November 2026**, in Spain. Keep it open on your computer, or print it.

The site: https://marccompta.github.io/marcona-app/

## Dates

| When | What |
|---|---|
| Until 11 November | Review slice 008, rehearse on real phones with the [rehearsal checklist](rehearsal-checklist.md), and fix what it finds |
| By the morning of 12 November | Steps 1 to 10 below |
| **12 November, 24 hours before the event** | **The feature freeze** starts. The awake check |
| 13 November | The event |

## Before the event, in this order

1. **Rehearse** on real phones, and fix what fails. Nothing new gets built.
2. **Make `main` live** (REQ-172): every slice is merged and pushed, and the newest run of **Deploy** in the repo's Actions tab is for `main` and succeeded. A push to a `slice/` branch also deploys, so check this again after the last merge.
3. **Export** from **Administració**, **Dades**, if you want a record of the tests. Optional. With all the test data it's slow, so if it fails, try again a minute later.
4. **Wipe:** type `ESBORRA` and tap **Esborra-ho tot**. Only your admin account and the settings remain, at 0 marcones. Check it: the user list in **Administració** shows only you, at 0, and **Classificació** shows its empty state until the next account exists. The automated tests that need `.env.test.local` and the demo players stop here: the demo players are gone, and so are the test accounts.
5. **Change your admin password,** from **Administració**, on your own row. It logs you out everywhere, so log in again with the new one, in the home screen app too.
6. **Delete `.env.test.local`** from the repo folder. It held the old password.
7. **Create the real accounts** from **Administració**, and note each password to give out.
8. **Set the starting balances,** with a concept such as `Saldo inicial`.
9. **Lock the wipe:** **Bloqueja l'esborrat**, then **Sí, bloqueja**. It can't be undone, and from now on nothing can delete the real data.
10. **Check the settings:** the roulette table, white and the maximum bet, and each game turned on or off as you want them.

## The day before: the awake check and the freeze

**Awake check** (REQ-171): on 12 November, log in on your phone and open **Classificació**. If it loads with the real players, the project is awake. A free Supabase project pauses after a week without use, and then nothing loads. If that happens, open the project in the Supabase dashboard and choose **Restore**. It takes a few minutes. Then check again.

**The freeze** (REQ-173, REQ-174): from 24 hours before the event, only fixes go in, and the Supabase MCP server is read-only:

1. In `.mcp.json`, add `&read_only=true` to the end of the Supabase `url`, so it ends in `?project_ref=ndkgmenntqhjojalqbdm&read_only=true`.
2. Restart Claude Code, and run `/mcp` to check that `supabase` is connected.
3. Claude can still read data and logs, but can't change the database or deploy a function. Tried on 9 November: the tools for migrations, deploys and branches disappear, and SQL runs as `supabase_read_only_user` in a read-only transaction, so a write is refused.

A fix that needs a migration or a function deploy needs your approval for that one fix: remove `&read_only=true`, restart, let Claude apply the fix, then put it back and restart again.

## If something goes wrong on the day

### A player is locked out

- **Forgot the password, or a wrong one:** **Administració**, tap their name, **Contrasenya nova**, and tell them the new one. It logs them out everywhere else.
- **Logged out of the home screen app on an iPhone:** it keeps its own login, separate from Safari. Log in again in the app.
- **Doesn't know their username:** it's in the list on **Administració**.
- **Removed by mistake:** a removal can't be undone. Create a new account with a different username, and give them their balance back with a concept that says why. Their old history stays in the audit.

### A game or event is stuck

- **A duel where someone won't pick, or has left:** ask both whether they've picked. If it can't finish, the admin opens it and cancels it, which refunds both. Nobody, including you, can see who has picked.
- **La minoria hasn't started:** the creator starts it once 3 have paid. If not enough people join, cancel it.
- **La minoria is stuck in the choosing:** the screen shows who hasn't picked yet. Ask them, or cancel it, which refunds everyone.
- **A classic event nobody completes:** its creator completes it, or the creator or the admin cancels it, which refunds everyone.
- **A screen looks out of date:** reload the page. A game's screen also checks every 3 seconds by itself.
- **A balance looks wrong:** the player's page and the audit show every movement, with the balance after each one. Correct it with an adjustment, with a concept that says why. Nothing is ever deleted.

### The site goes down

1. **Check your own connection first,** on another phone or on mobile data. Venue Wi-Fi is the most likely problem.
2. **Nothing loads at all:** check https://www.githubstatus.com, for GitHub Pages. If it's down, wait.
3. **The site loads but no data, or logins fail:** check https://status.supabase.com, and the project in the Supabase dashboard. If the project is paused, choose **Restore**.
4. **Down for more than a few minutes:** keep going on paper. Write down each change: who, how much, and why. When the site is back, enter each one as an adjustment, with the concept. Games and roulette wait until then.

## After the event

- **Export** from **Administració**, **Dades**, and keep both files somewhere safe. The free plan has no backups.
- The freeze ends when you say so. Then remove `&read_only=true` from `.mcp.json` and restart Claude Code.
