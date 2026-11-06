# Slice 002 design

## Approach

All money goes through one internal Postgres helper, `private.apply_movement()`. It locks the user's row, checks the balance, writes the ledger row and updates the balance. Public functions such as `admin_adjust()` check the caller, handle the client request ID and call that helper.

The `admin-users` Edge Function verifies that the caller is the active admin, and then creates, removes or resets users with the secret key. Removal updates the database first, so it takes effect at once, and then bans the Auth user and deletes their sessions.

Helpers in the `private` schema aren't reachable through the API. Every public function and policy calls `private.is_active()`.

## Affected components

| Component | Change |
|---|---|
| `supabase/migrations/` | Ledger, balances, requests, helpers, policies |
| `supabase/functions/admin-users/` | New Edge Function |
| `src/` | Ranking, user detail, audit and admin screens, chip stacks |
| `tests/` | Hosted money, security and concurrency tests, plus unit and browser tests |

## Data changes

- `profiles` gains `balance` (at least 0), `removed_at` and `is_test`, with a unique index allowing only one admin.
- New `ledger` table: user, delta, `balance_after` (at least 0), kind, concept, event, actor, details and time. A trigger rejects updates and deletes.
- New `money_requests` table: client request ID, user, action and stored result.

## Decisions

- [ADR 0003](../../docs/adr/0003-supabase-auth-with-hidden-emails.md): privileged actions in Edge Functions.
- [ADR 0004](../../docs/adr/0004-money-in-postgres-functions.md): money in Postgres functions.
- Test accounts have `is_test` set, and they only see each other. Real users never see them in the ranking or audit.
- Ledger rows store a kind and details, and the app turns these into Catalan. Only admin Concepts are free text.
- Reviews use a few demo users, whose passwords go in chat.

## Tooling needed

None. Edge Functions deploy through the Supabase MCP server.

## Risks

| Risk | Mitigation |
|---|---|
| Admin sign-out takes a user's token, not their ID, and deleting `auth.sessions` rows is community practice | Test it first. The active-user check keeps removal immediate either way |
| Removal fails halfway between the database and Auth | The database step goes first, and retrying is safe |
| A public function forgets the active-user check | A test calls every public function as a removed user |

## How this will be reviewed

On the phone at the public URL, as the admin and one demo player, using a second browser session for the player. It should take 5 to 10 minutes. The money and security rules are covered by tests, whose results appear in the review.
