# Architecture decision records

Why significant choices were made. Files are named `NNNN-short-title.md`, start from `templates/adr.md`, and follow [MADR](https://adr.github.io/madr/). ADRs are append-only: to change a decision, write a new ADR and mark the old one as superseded.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-static-react-site-on-github-pages.md) | Static React site on GitHub Pages | accepted |
| [0002](0002-one-hosted-supabase-project.md) | One hosted Supabase project as the only backend | superseded by 0007 |
| [0003](0003-supabase-auth-with-hidden-emails.md) | Supabase Auth with hidden emails, and privileged actions in Edge Functions | accepted |
| [0004](0004-money-in-postgres-functions.md) | All money moves in Postgres functions, on an append-only ledger | proposed |
| [0005](0005-server-decided-admin-run-games.md) | Games are decided on the server, and only the admin creates them | proposed |
| [0006](0006-catalan-interface-english-project.md) | Catalan interface, English project | accepted |
| [0007](0007-one-hosted-project-with-unattended-migrations.md) | One hosted Supabase project, with migrations that don't need manual approval | accepted |
