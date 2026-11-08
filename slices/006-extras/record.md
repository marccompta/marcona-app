# Slice 006 record

Written after human approval. Once the slice closes, this file is frozen.

- **Closed:** 2026-11-08
- **Commits:** `git log --grep "Slice: 006"`
- **Requirements:** REQ-150 to REQ-154

## What shipped

- **Live updates:** the ranking, a person's page, the audit, the events list and an event's screen read their data again when another phone changes something, with no reload. A phone catches up when it wakes, comes back online or reconnects.
- **A QR code:** **Codi QR per entrar** at the top of **Administració** opens `#/administracio/qr`, a black-on-white code for the site's address, drawn at build time.
- **Home screen install:** a web manifest, PNG icons drawn from the logo's spade, an SVG favicon, and the Apple tags, so the site installs as **MarcOna** and opens full screen.
- `npm run demo -- give <player> <amount>`, for reviews.

## Why

Everyone will watch the ranking move on the night, so it must keep up without anyone reloading. Friends need an easy way in, and an app on the home screen is easier to find than a bookmark.

**Refetch, not patch.** A Realtime message only says that a table changed. The screen then reads its data through the normal API, so Row Level Security decides what it sees, and nothing in the message is trusted. That keeps the code small, and it's cheap for a group this size. Realtime also applies Row Level Security before sending a message, and a hosted test checks that a real user hears nothing about a test account.

**No service worker,** because Chromium accepts the manifest without one, and offline use isn't in the backlog.

ADRs [0004](../../docs/adr/0004-money-in-postgres-functions.md) and [0005](../../docs/adr/0005-server-decided-admin-run-games.md) still hold: nothing here moves money, and secret choices stay out of every published table.

## How it works

- **The publication:** migration `realtime_publication` adds `profiles`, `ledger`, `events` and `event_participants` to `supabase_realtime`. `tests/sql/constraints.sql` checks that it holds exactly those four.
- **`src/lib/live.ts`:** `watchTables()` opens one channel per screen, with a `postgres_changes` binding per table, and an optional filter such as `id=eq.<uuid>`. It asks Realtime to wait with `postgres_changes_options: { wait: true }`, so `SUBSCRIBED` comes only once the database side is streaming. `useLive()` calls the screen's `reload()` 150ms after the last change in a burst, on every `SUBSCRIBED`, on `visibilitychange` to visible, and on `online`. It leaves the channel when the screen closes.
- **Screens:** `Ranking`, `UserDetail`, `Audit` and `Events` call `useLive()`. `EventDetail` does so only for a classic event. `GameEvent` watches its own event while it's open, through `liveEvent(id)` in `src/lib/events.ts`, and skips a change while `holdingReveal` is set or the tap queue's `busy()` is true. The 3-second polling stays as the fallback.
- **`useLoad()`** keeps showing the old data while it reads again, so a live read never flashes the loading state or loses form state.
- **The QR code:** a Vite plugin in `vite.config.ts` serves `virtual:site-qr`, an SVG from the `qrcode` package for `config.siteUrl`. `src/virtual.d.ts` types it. `src/screens/QrCode.tsx` shows it on white, whatever the theme.
- **Install:** `public/manifest.webmanifest` has `start_url` and `scope` of `./`, so they resolve under `/marcona-app/`. Vite adds the base path to the links in `index.html`. `scripts/make-icons.ts` draws `public/icon.svg` and the PNGs in `public/icons/` with Playwright. Rerun it with `npx tsx scripts/make-icons.ts` after changing the design.
- **Tests:**
  - `tests/e2e/fake-supabase.ts` answers the Realtime socket with `page.routeWebSocket()`. It sends a message after every function that would change a published table, as the real database would. `calls.live = false` silences it, `calls.notify()` sends one, and `calls.actAs()` and `calls.adjustAs()` play another phone. Routing a socket only works from the next page load, so the fake reloads a page that's already open.
  - `tests/e2e/live.spec.ts` covers the screens, and `tests/unit/live.test.tsx` the hook.
  - `tests/hosted/realtime.test.ts` and `tests/hosted/live.ts` cover the real project.
  - The duel secrecy test in `tests/hosted/games.test.ts` now listens to all four tables, checks that a first pick sends nothing, and checks that the reveal does arrive.
  - `tests/e2e/qr.spec.ts` decodes a screenshot of the code with `jsqr`.
  - `tests/e2e/install.spec.ts` checks the manifest, the icons' real sizes, the Apple tags and Chromium's reading of the manifest.
  - The smoke test now checks a live ranking and audit on the real project, with no waits.

## Deviations from the design

- **Waiting for Realtime:** not in the design. The real-project smoke test missed an audit row 3 times in about 5 runs, and realtime-js documents that `SUBSCRIBED` can come before the database side is streaming. The test then passed 4 times out of 4 with or without the fix, so the evidence is the documentation, not the test.
- **A duel watches for itself:** the design said one hook refetches on change. A live reveal would have jumped past the glow of the tap that completed the pair, so a game's screen skips changes while that tap is in flight or glowing, and polling picks up anything skipped.
- **Also refreshed:** a person's page, not only the ranking, audit and events, because it shows a balance and movements. Ruleta's balance and the admin's user list aren't, as REQ-211 records.
- **Tooling the design didn't list:** `jsqr` and `pngjs` as dev dependencies, to decode the QR code in a test, and `scripts/make-icons.ts`. `qrcode` is a dev dependency, as it only runs at build time.
- **`config.siteUrl`** is the one copy of the site's address, used by the QR plugin and tests.
- **The admin's QR button** is a quiet outlined link, not a gold one, so it doesn't compete with **Crea l'usuari**. Chosen from a screenshot.
- **Added at review:** `npm run demo -- give`, listed in `AGENTS.md`.
- **Existing tests changed:**
  - Three slice 005 games tests and one events test, because live reads now arrive before polling did: one polling test turns live off, two wait for the screen's first read, and one reads the reveal's position once its smooth scroll has stopped.
  - The slice 005 Realtime secrecy test was rewritten, as it had no positive control and would have heard unrelated changes once tables were published.
  - Two WebKit tests now wait for a loaded screen, or allow longer for a test account's long audit.
- **Test first:** the hosted Realtime tests and all browser tests for T1 to T4 failed before their code. The hook's unit tests were written after the hook, and the QR tests first failed at the build. To make up for it, 17 deliberate breaks were run, each checked to compile, and 16 were caught. The one not caught is removing the wait for Realtime.
- **Full suite per task:** the unit tests and the Chromium suite ran after T1 and T2. After T3 and T4, only the affected browser files ran, then everything at the end.

## Review outcome

One round, approved with no notes.

`slice-auditor` failed `review.md` in round 1 on the instructions, not the app. Every live update behaved as described, and it decoded the QR code. It found:
- **Administració** opened part-way down after a duel's reveal, hiding the new button. This is older than the slice, as every screen shares one scroll area, so it became REQ-213 and the step says to scroll up.
- Two screenshots were taken mid-fade.
- Nothing checked a person's page, or an event finishing while the phone was on the list.
- There was jargon, a dangling reference, and no warning that setup overwrites the admin's balance.

All were fixed, and a script reran the changed steps on the deployed site. No second audit ran. The human's approval doesn't say what they tried, so nothing here records a test on a real phone, a real lock and wake, or a real home screen install.

Results at the handover:
- 124 unit tests passed.
- 265 Chromium browser tests passed, 9 of them on the real project.
- WebKit ran on this machine, which Windows had blocked in slices 004 and 005: 261 passed and 3 failed. Two were fixed, and one, REQ-204's late tap, timed out once and passed on rerun. It isn't explained.
- GitHub Actions passed 511, with 19 skipped, after a rerun. The first run failed one WebKit roulette check that allows only 0.5 seconds for a click. It passed 6 times out of 6 locally.
- Hosted tests passed 182 on the second run. The first had one failure in a roulette test that logs in, and its message wasn't kept.
- All 19 rules in `constraints.sql` were rejected, as they should be.

## Gotchas

- **Never publish `private.choices`, and never let `lock_in()` write a public row before the reveal.** Live updates make any such write visible to every phone at once. `constraints.sql` and the hosted secrecy test check both.
- **A new table that a screen shows must be added to the publication,** and to `constraints.sql`'s list, or that screen won't update live.
- **A game's screen must not refresh during its own tap.** Anything that reloads `EventDetail` for a game would let the reveal start before the glow.
- **Tests that change the fake without a message** must wait for the screen's first read after subscribing, because that read would otherwise pick the change up. Tests about polling must set `calls.live = false`.
- **`fakeSupabase()` reloads an open page,** so set up anything that must survive, such as routes, with that in mind.
- **Reverting a deliberate break with `git checkout <file>`** also throws away uncommitted work in that file. It happened once here to `vite.config.ts`.
- **Python on Windows writes CRLF in text mode.** Use `newline=''` when editing files, or the diff fills with line-ending noise.
- **A test account's audit is long,** as it holds every automated test's movement, and WebKit can take over 5 seconds to load it. The wipe in slice 008 clears it.

## Follow-ups

- REQ-211: live updates for Ruleta's balance and the admin's user list.
- REQ-212: `vite.config.ts` imports `./src/config` without an extension, which Vite's native config loader won't accept.
- REQ-213: open each screen from the top.
- Try live updates, lock and wake, and the home screen install on real phones, especially an iPhone. Slice 008's rehearsal covers this.
- REQ-204's WebKit timeout and the CI roulette failure each happened once and weren't explained.

## Tooling lessons

- **The independent audit paid off again.** It found the scroll problem, which every test and my own screenshots missed, because my script went straight to each screen.
- **Retrying checks and stale assumptions:** three tests relied on polling being the only way a screen changed. Reading once, and waiting for a known state, fixed them, as `AGENTS.md` already advises.
- **Deliberate breaks:** five of the first twelve didn't compile, and two that did weren't caught until a test was strengthened. Checking `compiled=` in the script's output made both visible, as in slices 004 and 005.
- **My own slips:**
  - A `git checkout` to undo a break wiped uncommitted work.
  - Python wrote CRLF line endings and once a literal NUL byte.
  - Quoting in nested scripts failed twice.
- **Proposed to the human, nothing added:** a line in `AGENTS.md` saying to commit before running deliberate breaks, and to revert them with an edit, not `git checkout`.
