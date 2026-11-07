# Data model

The data the system stores **now**. Each slice updates this file when it closes.

## `public.profiles`

One row for each person who can log in.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` | Primary key, references `auth.users`, deleted with the user |
| `username` | `text` | Unique, 3 to 20 characters of `a-z`, `0-9`, `_` and `-` |
| `role` | `text` | `admin` or `player`, `player` by default |
| `created_at` | `timestamptz` | Set on insert |
| `balance` | `bigint` | At least 0, 0 by default. Only `private.apply_movement()` changes it |
| `removed_at` | `timestamptz` | Set when the user is removed. The row stays, so the username stays taken |
| `is_test` | `boolean` | True for accounts made by automated tests, false by default |

A unique index allows only one row with the role `admin`.

Row Level Security is on. Active users can read rows with the same `is_test` value as their own, including removed users. Nobody can write from the browser. The secret key can read, insert and update.

## `public.ledger`

The append-only record of every change to a balance. One row is one movement.

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` | Primary key, generated. Higher is newer |
| `user_id` | `uuid` | Whose balance changed, references `profiles` |
| `delta` | `bigint` | The change, never 0 |
| `balance_after` | `bigint` | The balance after this movement, at least 0 |
| `kind` | `text` | `admin_adjustment` |
| `concept` | `text` | The admin's reason. The only free text |
| `event_id` | `uuid` | The event, once events exist. No foreign key yet |
| `actor_id` | `uuid` | Who caused it, references `profiles` |
| `details` | `jsonb` | Anything else about the movement, `{}` by default |
| `created_at` | `timestamptz` | Set on insert |

Row Level Security is on. Active users can read the movements of every profile they can see. Triggers reject every update, delete and truncate, even from the owner.

## `private.money_requests`

Remembers each successful money action, so a repeat returns the first result. It isn't reachable through the API.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` | Who sent the action, references `profiles` |
| `request_id` | `uuid` | The client's request ID. With `user_id`, the primary key |
| `action` | `text` | `admin_adjust` |
| `result` | `jsonb` | What the first call returned |
| `created_at` | `timestamptz` | Set on insert |

## Functions

- **`public.admin_adjust(p_request_id, p_user_id, p_action, p_amount, p_concept)`:** adds or removes marcones. Only the active admin can call it. It returns the movement ID, the user, the delta and the balance after.
- **`public.revoke_sessions(p_user_id)`:** deletes a user's rows in `auth.sessions`. Only the secret key can call it.
- **`public.rls_report()`:** lists tables in the `public` and `private` schemas with Row Level Security off. Only the active admin can read it, and an empty result is the goal.
- **`private.apply_movement(...)`:** the one place a balance changes. It locks the user's row, checks the balance, and writes the ledger row, inside the caller's transaction. It refuses removed users.
- **`private.is_active()`, `private.is_admin()`, `private.is_test_account()`:** describe the caller, for policies and functions.

Functions raise codes, not sentences, and `src/i18n/errors.ts` turns them into Catalan.

## Outside the migrations

- `public.rls_auto_enable()` and its `ensure_rls` event trigger turn on Row Level Security for new tables in `public`. They were on the project before the first migration, and a migration has since revoked API access to the function.
- `supabase/functions/admin-users/` is deployed through the Supabase MCP server, with `verify_jwt` off because it checks the token itself.
- The admin's Auth user was created in the dashboard, and the Auth settings live there too.
