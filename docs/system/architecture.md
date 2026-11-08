# Architecture

How the system is built **now**. Each slice updates this file when it closes.

A static React site on GitHub Pages talks directly to one hosted Supabase project. There's no other server. See [ADR 0001](../adr/0001-static-react-site-on-github-pages.md) and [ADR 0008](../adr/0008-supabase-work-without-prompts.md).

## Components

| Component | What it is |
|---|---|
| `src/App.tsx` | Hash routes, and the choice between splash, login and the shell |
| `src/auth/` | Session, profile, and the username-to-email mapping |
| `src/i18n/` | The one text module, `Intl` helpers, plurals and error mapping |
| `src/shell/` | The framed layout, tab bar, logo, icons, chip stacks, count-up numbers and form helpers |
| `src/screens/` | Login, the ranking, a person's detail, the audit, the admin screen, the QR code, the events list, the new event form, the event screen and its shared actions, a duel's screen, its payoffs and reveal, La minoria's screen and reveal, the game settings, Ruleta, its wheel and the win celebration |
| `src/lib/` | The Supabase client, the data reads, live updates, calls to `admin_adjust`, the event functions, the game functions and tap queue, the roulette functions and `admin-users`, and the wheel's geometry |
| `src/theme/`, `public/fonts/` | Design tokens, styles and self-hosted fonts |
| `src/config.ts` | The Supabase URL and publishable key, which are safe to publish, and the site's address |
| `vite.config.ts` | The base path, and the plugin that draws the QR code at build time |
| `public/manifest.webmanifest`, `public/icons/`, `public/icon.svg` | Home screen install. `scripts/make-icons.ts` draws the icons |
| `supabase/migrations/` | Every schema change, applied to the hosted project through the Supabase MCP server |
| `supabase/functions/admin-users/` | The Edge Function that creates, resets and removes users, and the only use of the secret key |
| `.github/workflows/deploy.yml` | Tests, builds and deploys `main` and `slice/**` to Pages. The last push wins |
| `.github/workflows/ci.yml` | Runs the docs check, unit tests, build and browser tests |

The site is React, TypeScript and Vite, under the base path `/marcona-app/`. Supabase is on the free plan, in an EU region, with public sign-ups and anonymous sign-ins off.

## Key flows

**Logging in:** the username becomes `username@marcona.invalid`, and `signInWithPassword` starts a Supabase Auth session. The app then reads the user's row in `profiles`, which decides whether the Administració tab exists. The email never appears in the interface.

**Staying logged in:** Supabase keeps the session in the browser. `onAuthStateChange` reports it on load, and a separate effect loads the profile.

**Logging out:** `signOut({ scope: 'local' })` clears this device before calling the server, so it works offline.

**Checking the session:** an access token outlives its session, so the app calls `getUser()` on load and when the tab comes back. If the session has ended, that clears it and the login returns.

**Moving marcones:** the browser calls `admin_adjust()` with a client request ID. It checks the caller and the input, claims the ID, and calls `private.apply_movement()`, which locks the user's row and writes the ledger. It's all one transaction. See [ADR 0004](../adr/0004-money-in-postgres-functions.md).

**Running an event:** the browser calls `create_event()`, `answer_invitation()`, `cancel_event()` or `complete_event()`, each with a client request ID. Each one claims the ID, locks the event row and moves money through `private.apply_movement()`, in one transaction. Locks always go in the same order: the event, then users by ID, then participant rows. `answer_invitation()` and `cancel_event()` lock the event before claiming, because a game's reveal pays players while holding it, and claiming takes a shared lock on the caller's row. Payout maths lives in `private.split_pot()`.

**Running a game:** `create_game_event()` is admin-only. It copies the game's settings and description onto the event, which starts in the `inviting` phase, or `choosing` if forced. For a duel, `answer_invitation()` moves it to `choosing` once nobody is left invited, and a decline cancels it through `private.cancel_open_event()`, as `remove_profile()` does for an invited player. La minoria waits for the creator's `start_game()`, which needs at least 3 who have paid and lapses pending invitations, and a decline there is only a decline. See [ADR 0005](../adr/0005-server-decided-admin-run-games.md).

**Picking:** the browser sends taps through `createTapQueue()`, one at a time, keeping only the newest waiting one, and resends a lost reply once with the same request ID. `lock_in()` locks the event, claims the ID and writes to `private.choices`, touching no public table. A duel's tap replaces the last one. La minoria's panel sends one confirmed choice, and `lock_in()` refuses a second. When everyone has picked, it calls `private.resolve_game()` in the same transaction, which branches by game, pays out and completes the event. The creator is the actor, so nothing shows who tapped last.

**Waiting for a reveal:** the event screen polls `game_state()` every 3 seconds until the reveal, and reloads the event when the status or phase changes. For a duel, `game_state()` reads nothing about choices, so it can't differ by who asks or who has picked. For La minoria it also lists who has locked in, and never what, and `my_choice()` lets a player read back their own. The tap that completes the pair holds the reveal until its glow ends.

**Spinning:** the wheel starts on the tap, and the browser calls `spin()` with a client request ID. It locks the player, claims the ID, checks the table and the limits, draws with `private.draw_roulette()`, and writes one movement, in one transaction. The player's row comes before the claim, because claiming takes a shared lock on it. The wheel then settles on a stopping point worked out only from the returned result, and the result, balance and win celebration wait until it has stopped. Screens read the settings and the maximum bet from `roulette_state()`, so the rule lives only in `private.max_bet()`.

**Managing users:** the browser calls `admin-users`, which checks the token with Auth and that the profile is the active admin. See [ADR 0003](../adr/0003-supabase-auth-with-hidden-emails.md).

**Removing a user:** `admin-users` calls `remove_profile()` first. It locks the user's row, refuses if they've accepted an open event, declines their pending invitations and sets `removed_at`, so every policy and function rejects them at once. The Edge Function then bans the Auth user and deletes their sessions. Every step is safe to repeat.

**Live updates:** Realtime publishes `profiles`, `ledger`, `events` and `event_participants`, and checks Row Level Security before sending each message. A screen calls `useLive()` from `src/lib/live.ts`, which opens a channel for its tables and asks Realtime to confirm only once the database side is streaming. On any change, 150ms after the last one in a burst, it calls the screen's `reload()`, which reads through the normal API. It also reads again on each subscribe or reconnect, when the phone wakes, and when the browser comes back online. A message's content is never used. A game's screen watches its own event, but skips changes while the player's own tap is on its way or glowing, and keeps its 3-second polling as a fallback.

**Showing the QR code:** a Vite plugin turns `config.siteUrl` into an SVG at build time, which `#/administracio/qr` shows on white.

**Errors:** functions return codes, and `errorMessage()` turns any error into Catalan, never showing the original text. One refusal carries data: `forced_insufficient_balance` has the usernames in its detail.

## How to run and test

The commands are in `AGENTS.md`. The human's one-off steps are in `docs/setup.md`.

- Unit tests run everywhere, including the secret scan.
- Browser tests run at 360px in Chromium and WebKit, against a fake Supabase in `tests/e2e/fake-supabase.ts`. It also fakes the Realtime socket, and sends a message after every function that would change a published table. `calls.live = false` silences it. Routing a socket only works from the next page load, so it reloads a page that's already open.
- `tests/hosted/` and `tests/e2e/hosted.spec.ts` use the real project, and need the gitignored `.env.test.local`, so they run only on the human's machine. The accounts they create have `is_test` set, and stay until the wipe.
- `tests/e2e/smoke.spec.ts` is the phone-sized smoke test of the main flows, on the real project. Each later slice extends it.
- `tests/sql/constraints.sql` tries what only the database owner can try, `tests/sql/events.sql` tests the payout maths and forced participation, playing the real admin, and `tests/sql/roulette.sql` tests the odds and white, `tests/sql/games.sql` tests the game rules and payouts, and `tests/sql/minoria.sql` La minoria's rules, payouts and option names. They run through the Supabase MCP server, and always roll back.
- A game needs the admin, who can't invite test accounts, so `tests/hosted/games.test.ts` and the smoke duel and La minoria play `demo-nuria` and `demo-pau`, and their games stay on the screens until the wipe. Logging a demo player in ends their other sessions, so the smoke tests that play them take turns through a lock in `tests/e2e/demo-players.ts`.
- `tests/hosted/roulette.test.ts` changes the real roulette settings and puts them back, so every test that spins lives there.
- `tests/hosted/demo.ts`, run with `npm run demo`, plays the demo accounts during a review. It's for use before the wipe only: `fund` cancels every open event.
- CI runs the browser tests in both engines, on Linux. Tests that need `.env.test.local` skip themselves there, and CI runs no hosted tests. This is the only WebKit cover when Windows Smart App Control blocks it on the human's machine.
