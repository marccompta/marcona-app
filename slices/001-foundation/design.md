# Slice 001 design

## Approach

Build everything that doesn't need Supabase first, starting with the visual directions, so the human can choose one while doing the setup. Then add the project, the first migration and the login, and prove the whole path on the deployed site.

The login turns a username into `username@<placeholder domain>` and calls `signInWithPassword`. The admin account is created by hand during setup, because no one can create users yet.

## Affected components

| Component | Change |
|---|---|
| `src/` | New: app shell, routes, login, ranking empty state |
| `src/i18n/` | New: the one text module, `Intl` helpers, plurals, error mapping |
| `src/theme/`, `public/fonts/` | New: design tokens and self-hosted fonts |
| `supabase/migrations/` | New: first migration |
| `.github/workflows/deploy.yml` | New: builds and deploys `main` and `slice/**` branches |
| `.github/workflows/ci.yml` | Adds unit tests and the build |
| `tests/` | New: Vitest unit and hosted-project tests, Playwright browser tests |
| `.mcp.json`, `docs/tooling.md`, `docs/setup.md`, `AGENTS.md` | New or updated: tooling, setup and commands |

## Data changes

A new `profiles` table holds `user_id`, `username`, `role` and `created_at`. Row Level Security is on, and only logged-in users can read it. An admin-only `rls_report()` function lists any table without Row Level Security, for the tests. Slice 002 extends this table.

## Decisions

- [ADR 0001](../../docs/adr/0001-static-react-site-on-github-pages.md): static React site on GitHub Pages.
- [ADR 0002](../../docs/adr/0002-one-hosted-supabase-project.md): one hosted Supabase project.
- [ADR 0003](../../docs/adr/0003-supabase-auth-with-hidden-emails.md): Supabase Auth with hidden emails.
- [ADR 0006](../../docs/adr/0006-catalan-interface-english-project.md): Catalan interface, English project.
- The Supabase URL and publishable key go in a committed config file, because `.gitignore` excludes `.env.*`.
- Hosted tests read the admin's password from `.env.test.local`, which is already gitignored.
- The visual direction is B, "Saló privat", chosen by the human on 2026-11-06 from the three in `evidence/directions/`.

## Tooling needed

Install commands get checked against official docs before use.

| Item | Job | Who does it |
|---|---|---|
| Supabase MCP | Migrations, queries, logs and docs, scoped with `project_ref`, manual approval on | Claude configures, the human authorises |
| Playwright MCP | Interactive phone-sized checks and review screenshots, using `--device` | Claude configures, the human approves |
| `frontend-design` plugin | Distinctive visual quality | The human runs `/plugin install frontend-design@claude-plugins-official` |
| Supabase agent skills | Postgres and Row Level Security practice, from the official `supabase/agent-skills` repo | Claude installs |
| npm packages | React, `supabase-js`, a hash router, Vite, Vitest, Playwright, and font packages | Claude installs |

Not added: a GitHub MCP server, because `gh` covers it, and the Supabase CLI, because the MCP server covers migrations and function deploys.

## Risks

| Risk | Mitigation |
|---|---|
| Auth rejects the placeholder email domain | Test it when creating the admin account, and choose another domain if needed |
| `github-pages` refuses slice branches, because it allows only the default branch | `docs/setup.md` adds `slice/*` to its deployment branches |
| Five long Catalan tab labels don't fit at 360px | Check them in the visual directions, and shorten them if needed |
| Setup takes longer than expected | Everything that doesn't need Supabase comes first |

## How this will be reviewed

On the human's phone at the public URL, logging in as the admin, plus the direction images in `evidence/`. It should take 5 to 10 minutes. The setup itself is checked step by step during the build.
