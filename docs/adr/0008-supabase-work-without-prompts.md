# 0008. Routine Supabase work runs without prompts

- **Status:** accepted
- **Date:** 2026-11-07
- **Slice:** none, decided after slice 004

## Context and problem

[ADR 0007](0007-one-hosted-project-with-unattended-migrations.md) let migrations run unattended, and kept `ask` rules on the other Supabase tools that can change something. During slice 004, the human was asked repeatedly before routine database work. An `ask` rule in `.claude/settings.json` beats any `allow` rule, so saved approvals for `execute_sql` and `deploy_edge_function` had no effect. The human asked for Claude to be more autonomous, unless something is very, very risky. This ADR replaces 0007, and keeps everything else it decided.

## Options considered

- Keep the `ask` rules, and accept the prompts
- Remove every Supabase `ask` rule
- Remove the `ask` rules on routine tools, keep them on secrets and branches, and have Claude stop for very risky actions

## Decision

Migrations, `execute_sql` and Edge Function deploys need no manual approval. `create_edge_function_secret` and the Supabase branch tools keep their `ask` rules: secrets are sensitive, and this project doesn't use branches.

A permission rule can't read SQL, so the rest depends on judgement. Claude stops and asks before anything very risky, whichever tool it uses:

- Deleting or rewriting data that real people's balances or history depend on, including the wipe.
- Weakening a safeguard: Row Level Security, the ledger's append-only triggers, or the rule that only functions move money.
- Anything that can't be undone and has no backup, as the free plan has none.

The Supabase server can also ask for confirmation of destructive statements. That check belongs to Supabase, and project settings don't change it. The switch to `read_only=true` at the feature freeze (REQ-174) still stands.

## Consequences

- Good: slices can build and check the database without stopping.
- Good: the prompts that remain mean something.
- Bad: `execute_sql` can change or delete anything with no prompt, so a mistake reaches the live database unchecked. Tests that write always roll back, but that's a habit, not a guard.
- Bad: the line between routine and very risky is Claude's judgement. This matters more once real marcones exist.
