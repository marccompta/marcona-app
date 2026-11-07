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
| `src/screens/` | Login, the ranking, a person's detail, the audit, the admin screen, the events list, the new event form, the event screen, Ruleta, its wheel and the win celebration |
| `src/lib/` | The Supabase client, the data reads, calls to `admin_adjust`, the event functions, the roulette functions and `admin-users`, and the wheel's geometry |
| `src/theme/`, `public/fonts/` | Design tokens, styles and self-hosted fonts |
| `src/config.ts` | The Supabase URL and publishable key, which are safe to publish |
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

**Running an event:** the browser calls `create_event()`, `answer_invitation()`, `cancel_event()` or `complete_event()`, each with a client request ID. Each one claims the ID, locks the event row and moves money through `private.apply_movement()`, in one transaction. Locks always go in the same order: the event, then users by ID, then participant rows. Payout maths lives in `private.split_pot()`.

**Spinning:** the wheel starts on the tap, and the browser calls `spin()` with a client request ID. It locks the player, claims the ID, checks the table and the limits, draws with `private.draw_roulette()`, and writes one movement, in one transaction. The player's row comes before the claim, because claiming takes a shared lock on it. The wheel then settles on a stopping point worked out only from the returned result, and the result, balance and win celebration wait until it has stopped. Screens read the settings and the maximum bet from `roulette_state()`, so the rule lives only in `private.max_bet()`.

**Managing users:** the browser calls `admin-users`, which checks the token with Auth and that the profile is the active admin. See [ADR 0003](../adr/0003-supabase-auth-with-hidden-emails.md).

**Removing a user:** `admin-users` calls `remove_profile()` first. It locks the user's row, refuses if they've accepted an open event, declines their pending invitations and sets `removed_at`, so every policy and function rejects them at once. The Edge Function then bans the Auth user and deletes their sessions. Every step is safe to repeat.

**Errors:** functions return codes, and `errorMessage()` turns any error into Catalan, never showing the original text. One refusal carries data: `forced_insufficient_balance` has the usernames in its detail.

## How to run and test

The commands are in `AGENTS.md`. The human's one-off steps are in `docs/setup.md`.

- Unit tests run everywhere, including the secret scan.
- Browser tests run at 360px in Chromium and WebKit, against a fake Supabase in `tests/e2e/fake-supabase.ts`.
- `tests/hosted/` and `tests/e2e/hosted.spec.ts` use the real project, and need the gitignored `.env.test.local`, so they run only on the human's machine. The accounts they create have `is_test` set, and stay until the wipe.
- `tests/e2e/smoke.spec.ts` is the phone-sized smoke test of the main flows, on the real project. Each later slice extends it.
- `tests/sql/constraints.sql` tries what only the database owner can try, `tests/sql/events.sql` tests the payout maths and forced participation, playing the real admin, and `tests/sql/roulette.sql` tests the odds and white. They run through the Supabase MCP server, and always roll back.
- `tests/hosted/roulette.test.ts` changes the real roulette settings and puts them back, so every test that spins lives there.
- `tests/hosted/demo.ts`, run with `npm run demo`, plays the demo accounts during a review. It's for use before the wipe only: `fund` cancels every open event.
- CI runs the browser tests in both engines, on Linux. Tests that need `.env.test.local` skip themselves there, and CI runs no hosted tests. This is the only WebKit cover when Windows Smart App Control blocks it on the human's machine.
