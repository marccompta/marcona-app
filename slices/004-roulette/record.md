# Slice 004 record

Written after human approval. Once the slice closes, this file is frozen.

- **Closed:** 2026-11-07
- **Commits:** `git log --grep "Slice: 004"`
- **Requirements:** REQ-101 to REQ-119

## What shipped

Anyone can play roulette between events, and the admin can tune or close the table.

- The Ruleta tab: pick red or black, bet up to the limit, and spin.
- A wheel of 37 pockets with a ball, which lands on the server's result, and shows it at once with reduced motion.
- A win celebration: the marcones won, large over the wheel for about a second, and confetti across the screen.
- `spin()`, the secure draw, and the limits, all on the server.
- `app_settings`, `roulette_state()` and `set_roulette_settings()`, with the settings on the admin screen.
- Spins in the audit, with the choice and the result.
- A `browsers` job in CI, which runs the browser tests in Chromium and WebKit.

## Why

People need something to play between events, and roulette proves the server can decide outcomes fairly. It moves money, so it follows [ADR 0004](../../docs/adr/0004-money-in-postgres-functions.md): one Postgres function, one transaction and a client request ID. Secure randomness comes from `gen_random_bytes()`, as [ADR 0005](../../docs/adr/0005-server-decided-admin-run-games.md) plans for games. No new ADR was needed.

## How it works

- **A spin:** `spin()` checks the caller, the choice and the shape of the bet, locks the player's row, claims the request ID, reads the settings, checks the table is open and the bet is within the balance and the limit, draws, and writes one movement through `private.apply_movement()`.
- **The latest `spin()`** is in `20261107135018_roulette_settings.sql`, which replaced the first version to add the closed check. A repeat of a finished spin still gets its answer once the table has closed, because the claim comes before that check.
- **The draw:** `private.random_below()` reads 4 secure bytes and redraws values past the last full multiple, so nothing is favoured. `private.roulette_colour()` splits 2N slots into 2 white and N - 1 each of red and black. With N of 37, that's exactly 18, 18 and 1 in 37.
- **The limit:** `private.max_bet()` is the only copy of the rule. Screens read the result from `roulette_state()`, which also returns the settings and balance, so the browser never touches `app_settings`.
- **The wheel:** `src/screens/Wheel.tsx` exposes `start()`, `land()` and `rest()`. It turns from the tap, reaches full speed, then settles. `stopRotation()` in `src/lib/roulette.ts` is the only place a stopping point is worked out, and it starts from the server's result. Only the disc's CSS rotation changes each frame, and `data-landed` comes from the final rotation, not the result, so a test comparing them means something.
- **What waits for the wheel:** `Roulette.tsx` awaits `land()` before it sets the result, so the result, the balance and the celebration can't give the spin away.
- **The celebration:** `src/screens/WinBurst.tsx` shows the amount and draws confetti on a canvas with no dependency. The canvas is a portal on `body`, and nothing in it takes a tap.
- **A failed spin:** the request ID is kept unless the bet or colour changes, so a retry can't spin twice. The table is then read again quietly, so a failed read doesn't take the screen away.
- **Tests:** `tests/hosted/roulette.test.ts` covers the rules on the real project, including concurrency. `tests/sql/roulette.sql` covers the odds and white, in a rolled-back transaction. `tests/e2e/roulette.spec.ts` covers the screens, and `tests/unit/roulette.test.ts` the wheel's geometry.

## Deviations from the design

- **`public.roulette_state()`, added:** the design didn't list it. It keeps the limit rule on the server, and means `app_settings` needs no policies.
- **`spin()` locks the player before claiming the request:** claiming takes a shared lock on the same row, so two spins that claimed first would deadlock. The hosted tests fire 6 spins at once to check this.
- **`tests/sql/roulette.sql`, added:** hosted tests can't make white come up, so it lowers the odds inside a transaction that rolls back.
- **The win celebration, added in review:** the human asked for it, and it was treated as a fix under REQ-113, so there's no new requirement. Reduced motion keeps the amount, still, and drops the confetti, which was my call.
- **The CI `browsers` job, added at the human's request:** see the WebKit note under Review outcome. It's the only WebKit cover while Windows blocks it on the human's machine.
- **Reviewed as the admin,** not a demo player as the design said, because demo passwords aren't kept.
- **Existing tests changed:** REQ-046 now looks for password inputs, as Ruleta has a bet field, and `tests/hosted/screens.test.ts` expects `details`. `Placeholder.tsx` went, as Ruleta was its last use.
- **Test first:** T1, T2, T4, T6 and the review fixes failed before they passed, though T1 and T2 failed because the functions didn't exist. T3's tests never had a failing run, because the migration went in at the same step that a script of mine stopped. T5's unit tests failed first, but its browser tests failed at the strict build. Deliberate breaks stood in for those: 11 in the screens and 13 in the celebration, all caught in the end. I didn't break the SQL on purpose, as it's the live database.
- **Full suite per task:** after each task I ran the unit tests and that task's tests. The full suites ran at the end.
- **Migrations:** `spin` contains a `drop constraint`, and all three applied the first time. I can't tell whether anyone was asked, and the same goes for `execute_sql`.

## Review outcome

Two rounds, then approved with no notes.

- **Round 1:** the human asked for a more "dopaminic" win: confetti, and the marcones won shown more prominently for a second. That became R1.1 and R1.2.
- **Round 2:** approved.

`slice-auditor` failed `review.md` in both rounds, each time on its wording, not the slice. Every on-screen result matched, apart from one loose phrase in round 1. Its main catches were that two spins often don't show both a win and a loss, and that a bet of 5 needs 100 marcones at 5%. All were fixed, and no second audit ran in either round. The human's approval doesn't say what they tried, so nothing here records a test on a real iPhone.

**WebKit couldn't run on the human's machine.** Windows Smart App Control blocked the unsigned DLLs in Playwright's WebKit, with exit code `0xC0E90002`, on 7 November, though slice 003's runs had worked. Nobody knows why it changed. The human chose to review on Chromium, then asked for WebKit in GitHub Actions, and turning the protection off was left alone.

Results at the handover: 107 unit tests, 177 Chromium browser tests locally and against the deployed site, and 340 in GitHub Actions, 170 per engine, with 14 skipped that need the real project. In round 1: 166 hosted tests, all 13 owner-level rules rejected, and 370,000 draws giving 179,201 red, 180,717 black and 10,082 white. `tests/sql/events.sql` wasn't run, as no migration touched payouts. The hosted and SQL checks weren't rerun in round 2, as nothing in the database changed.

Two full Chromium runs had real-project login failures, 4 tests and then 1, which passed on a rerun with fewer workers. It looks like the stall slice 003 recorded, and the cause is still unknown.

## Gotchas

- **`spin()` must lock the player before claiming.** Other money functions claim first, which REQ-208 proposes to fix.
- **Hosted tests change the real roulette settings** and put them back at the end, so every test that spins lives in `tests/hosted/roulette.test.ts`, where they run one at a time. A run killed partway can leave the settings changed.
- **Don't assume the settings outside that file.** The admin can change them, which broke the smoke test once. It now bets 1, which is allowed at any setting.
- **Roulette rules need changing twice:** in the migrations, and in `tests/e2e/fake-supabase.ts`.
- **A retrying check can't prove something expiring is absent.** `toHaveCount(0)` waited for a wrong celebration to end by itself, and passed. Use `nothingCelebrating()`, which counts at once. Time things in the browser, as in `timeOnScreen()`.
- **Reduced motion shrinks every CSS animation to nothing.** One that ends hidden, like the win amount, then never shows, so it needs `animation: none` there.
- **The wheel is a picture.** It always draws one white pocket, whatever the odds. `pockets` in `src/lib/roulette.ts` has nothing to do with the draw.
- **`app_settings` has no policies, on purpose.** New settings in slice 005 need a public function to read them, and the Supabase advisor's note about it is expected.
- **The wipe in slice 008** must deal with spin rows in the ledger, and it should leave `app_settings` alone, or put the defaults back. `spin()` needs the `roulette` row to exist.

## Follow-ups

- REQ-207: a lost connection shows the general error on every function call.
- REQ-208: other money functions may deadlock if two arrive together for one user. Found reading the code, not reproduced.
- Live refresh, in slice 006: a closed table only shows after a reload or a refused spin.
- Not tried on a real phone by Claude, including how the confetti runs on an older one. REQ-169 covers this.
- WebKit against the real project isn't tested anywhere while Windows blocks it locally, because CI has no login.
- Players aren't told the current odds. Nothing asked for it.
- Find out why Chromium stalls at login, carried over from slice 003.
- Each hosted run adds hidden accounts until the wipe, and the audits left 3 more.

## Tooling lessons

- **Added, at the human's request:** the CI `browsers` job.
- **Deliberate breaks found a real gap again:** "every result celebrates" survived, because of the retrying check above. Two others failed at the build and proved nothing, which `compiled=` in the script's output exposed.
- **Looking at screenshots found what tests couldn't:** the ivory ball was nearly invisible in the ivory pocket.
- **Sampling every frame** checked what stills can't: the wheel never went backwards or jumped in speed.
- **My own tooling slips:** Git Bash heredocs with apostrophes failed, as `AGENTS.md` warns. Python in text mode wrote CRLF on Windows, which then broke exact matches. `| tail` hid a failing exit code, so a task was ticked before it passed, though it was caught before the commit.
- **Proposed to the human, nothing added:** a line in `AGENTS.md` on retrying checks for things that expire, and one on editing files with `newline=''` and using `set -o pipefail`.
