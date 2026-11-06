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

Row Level Security is on. Logged-in users can read every row, and nobody can write from the browser.

## Functions

- **`public.rls_report()`:** lists tables in the `public` and `private` schemas with Row Level Security off. Only the admin can read it, and an empty result is the goal.

## Outside the migrations

- `public.rls_auto_enable()` and its `ensure_rls` event trigger turn on Row Level Security for new tables in `public`. They were on the project before the first migration.
- The admin's Auth user was created in the dashboard, and the Auth settings live there too.
