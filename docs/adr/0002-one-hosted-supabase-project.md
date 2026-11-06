# 0002. One hosted Supabase project as the only backend

- **Status:** superseded by [0007](0007-one-hosted-project-with-unattended-migrations.md)
- **Date:** 2026-11-06
- **Slice:** 001

## Context and problem

A static site still needs a database, login and server-side logic. Docker isn't installed on this machine, so the local Supabase stack isn't available.

## Options considered

- One hosted Supabase project on the free plan
- A second free project for tests, which would keep test data out but apply every migration twice
- Running the local Supabase stack, which needs Docker

## Decision

One hosted project on the free plan, in an EU region. Migrations live in `supabase/migrations/` and are applied through the Supabase MCP server with manual approval. Tests run against this project. They log in with the admin's password from a gitignored local file, which the human changes after the final wipe.

## Consequences

- Good: one setup, one place to look, and a real environment for every test.
- Bad: a slice's migrations reach the shared database before the slice is approved, so a rejected slice needs a rollback migration.
- Bad: test and real data share tables. Test accounts are flagged and hidden, and hosted tests stop after the final wipe.
- Bad: the free plan has no automatic backups and pauses after a week of inactivity, so the app needs its own export and a check the day before the event.
- Bad: hosted database tests run only from this machine, because CI has no credentials.
