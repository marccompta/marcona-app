# 0004. All money moves in Postgres functions, on an append-only ledger

- **Status:** proposed
- **Date:** 2026-11-06
- **Slice:** 002

## Context and problem

The site is static, so the browser can't be trusted. Mobile networks retry, people double-tap, and two actions can land at once. Balances must stay correct anyway.

## Options considered

- Postgres functions, each one transaction with row locks
- Edge Functions doing the money logic, which would need several calls per action and can't hold a transaction open
- Writes from the browser protected only by Row Level Security, which can't enforce the rules across tables

## Decision

Every change to marcones runs in a single Postgres function, through one internal helper that locks the user's row and writes the ledger. The browser has no direct write access. The ledger is append-only, each row stores the balance after it, and a constraint stops balances going below 0. Each money action carries a client request ID, so a repeat returns the first result.

## Consequences

- Good: rounding, concurrency and double taps are handled in one place, and can be tested directly.
- Good: every balance can be explained from the ledger.
- Bad: logic in SQL is harder to change, and every change is a migration.
- Bad: the wipe has to be a single, tightly guarded exception to the append-only rule.
