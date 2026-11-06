# Supabase checks

Observed on 2026-11-06 through the Supabase MCP server, on project `ndkgmenntqhjojalqbdm`.

## Migrations (REQ-032)

`list_migrations` on the project, next to `supabase/migrations/`:

| Applied version | Applied name | File in the repo |
|---|---|---|
| `20261106214515` | `profiles` | `20261106214515_profiles.sql` |
| `20261106215724` | `admin_profile` | `20261106215724_admin_profile.sql` |

The project had no tables and no migrations before the first one.

## Security advisor

`get_advisors` with type `security` returned three warnings and no errors.

| Warning | Finding | What we did |
|---|---|---|
| `anon_security_definer_function_executable` | "Function `public.rls_auto_enable()` can be executed by the `anon` role as a `SECURITY DEFINER` function" | Left as it is, see below |
| `authenticated_security_definer_function_executable` | The same function, for the `authenticated` role | Left as it is, see below |
| `auth_leaked_password_protection` | "Leaked password protection is currently disabled." | Can't be turned on: the docs say it's "available on the Pro Plan and above", and this project is on the free plan |

### `rls_auto_enable()`

- It isn't in our migrations. It was on the project before the first migration ran.
- It matches the event trigger in Supabase's docs, which runs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on each new table. Its trigger here is `ensure_rls`, on `CREATE TABLE`, `CREATE TABLE AS` and `SELECT INTO`.
- It returns `event_trigger`. Calling it with the publishable key fails:

  ```
  POST /rest/v1/rpc/rls_auto_enable
  HTTP 400
  {"code":"0A000","details":null,"hint":null,"message":"cannot display a value of type event_trigger"}
  ```

So the warning has no effect in practice, and the trigger backs up REQ-009 for later slices.

## Anonymous access (REQ-008, REQ-009, REQ-010)

With only the publishable key:

| Request | Result |
|---|---|
| `GET /rest/v1/profiles?select=*` | HTTP 401, `42501`, "permission denied for table profiles" |
| `POST /rest/v1/rpc/rls_report` | HTTP 401, `42501`, "permission denied for function rls_report" |
| `POST /auth/v1/signup` | HTTP 422, `signup_disabled`, "Signups not allowed for this instance" |

`list_tables` on `public` shows `profiles` with Row Level Security on.
