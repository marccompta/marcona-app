# Architecture

How the system is built **now**. Each slice updates this file when it closes.

A static React site on GitHub Pages talks directly to one hosted Supabase project. There's no other server. See [ADR 0001](../adr/0001-static-react-site-on-github-pages.md) and [ADR 0007](../adr/0007-one-hosted-project-with-unattended-migrations.md).

## Components

| Component | What it is |
|---|---|
| `src/App.tsx` | Hash routes, and the choice between splash, login and the shell |
| `src/auth/` | Session, profile, and the username-to-email mapping |
| `src/i18n/` | The one text module, `Intl` helpers, plurals and error mapping |
| `src/shell/` | The framed layout, tab bar, logo and icons |
| `src/screens/` | Login, the ranking, and placeholders for unbuilt screens |
| `src/theme/`, `public/fonts/` | Design tokens, styles and self-hosted fonts |
| `src/config.ts` | The Supabase URL and publishable key, which are safe to publish |
| `supabase/migrations/` | Every schema change, applied to the hosted project through the Supabase MCP server |
| `.github/workflows/deploy.yml` | Tests, builds and deploys `main` and `slice/**` to Pages. The last push wins |
| `.github/workflows/ci.yml` | Runs the docs check, unit tests and build |

The site is React, TypeScript and Vite, under the base path `/marcona-app/`. Supabase is on the free plan, in an EU region, with public sign-ups and anonymous sign-ins off.

## Key flows

**Logging in:** the username becomes `username@marcona.invalid`, and `signInWithPassword` starts a Supabase Auth session. The app then reads the user's row in `profiles`, which decides whether the Administració tab exists. The email never appears in the interface.

**Staying logged in:** Supabase keeps the session in the browser. `onAuthStateChange` reports it on load, and a separate effect loads the profile.

**Logging out:** `signOut({ scope: 'local' })` clears this device before calling the server, so it works offline.

**Errors:** `errorMessage()` turns any error into Catalan, and never shows the original text.

## How to run and test

The commands are in `AGENTS.md`. The human's one-off steps are in `docs/setup.md`.

- Unit tests run everywhere, including the secret scan.
- Browser tests run at 360px in Chromium and WebKit, against a fake Supabase in `tests/e2e/fake-supabase.ts`.
- `tests/hosted/` and `tests/e2e/hosted.spec.ts` use the real project, and need the gitignored `.env.test.local`, so they run only on the human's machine.
- CI doesn't run browser or hosted tests.
