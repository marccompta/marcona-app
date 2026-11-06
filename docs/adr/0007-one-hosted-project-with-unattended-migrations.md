# 0007. One hosted Supabase project, with migrations that don't need manual approval

- **Status:** proposed
- **Date:** 2026-11-06
- **Slice:** 001

## Context and problem

[ADR 0002](0002-one-hosted-supabase-project.md) applied migrations through the Supabase MCP server with manual approval. During slice 001, two migrations ran in auto mode with no prompt. Asked about it, the human decided that auto mode can stay on and migrations don't need their manual approval. This ADR replaces 0002, and keeps everything else it decided.

## Options considered

- Keep manual approval, with auto mode off for all Supabase work
- Turn auto mode off for the whole repo with `permissions.disableAutoMode`
- Let migrations run without approval, and keep the prompt rules on the other Supabase tools that can change something

## Decision

One hosted project on the free plan, in an EU region. Migrations live in `supabase/migrations/` and are applied through the Supabase MCP server, which is scoped to this project with `project_ref`. Auto mode may stay on, and migrations don't need the human's manual approval. The other Supabase tools that can change something keep their `ask` rules in `.claude/settings.json`. Tests run against this project. They log in with the admin's password from a gitignored local file, which the human changes after the final wipe.

## Consequences

- Good: slices can build without stopping for each migration.
- Good: one setup, one place to look, and a real environment for every test.
- Bad: a wrong migration can reach the live database with no human check, so review and the hosted tests are what catch it. This matters more once real marcones exist.
- Bad: a slice's migrations reach the shared database before the slice is approved, so a rejected slice needs a rollback migration.
- Bad: test and real data share tables. Test accounts are flagged and hidden, and hosted tests stop after the final wipe.
- Bad: the free plan has no automatic backups and pauses after a week of inactivity, so the app needs its own export and a check the day before the event.
- Bad: hosted database tests run only from this machine, because CI has no credentials.
- Unknown: whether `ask` rules hold in auto mode hasn't been tested.
