# Slice 003 database checks

Run through the Supabase MCP server's `execute_sql` on 2026-11-07, after the last migration. Both files end by raising an exception, which rolls everything back and carries these results.

## `tests/sql/constraints.sql`

Every entry should say "rejected".

| Rule | Result |
|---|---|
| REQ-056 second admin | rejected |
| REQ-059 update as owner | rejected |
| REQ-059 delete as owner | rejected |
| REQ-059 truncate as owner | rejected |
| REQ-061 negative balance | rejected |
| REQ-061 movement below 0 | rejected |
| REQ-061 negative balance_after | rejected |
| REQ-074 percentages not 100 | rejected |
| REQ-075 buy-in of 0 | rejected |
| REQ-083 unknown state | rejected |
| REQ-083 reopen as owner | rejected |
| REQ-083 rename as owner | rejected |
| REQ-099 movement with unknown event | rejected |

## `tests/sql/events.sql`

Every check should say "passed". It tried 61,812 pot and percentage combinations.

| Check | Result |
|---|---|
| REQ-093 spec examples | passed |
| REQ-093 always sums to the pot | passed |
| REQ-187 a player cannot force | passed |
| REQ-188 everyone is in and charged once | passed |
| REQ-188 a forced player cannot withdraw | passed |
| REQ-188 the admin completes without waiting | passed |
| REQ-189 a short player stops the event | passed |
| REQ-189 nobody is charged | passed |
| REQ-190 the audit shows the admin | passed |
| REQ-096 a forced player stays | passed |

## Advisors

- **Security:** signed-in users can run `admin_adjust`, `answer_invitation`, `cancel_event`, `complete_event` and `create_event`. That's intended: each one checks the caller, as [ADR 0004](../../../docs/adr/0004-money-in-postgres-functions.md) describes. `private.money_requests` has Row Level Security on with no policies, which is also intended, as only functions reach it. Leaked password protection is off, as it was before this slice.
- **Performance:** three indexes are unused so far, which is normal for new tables.
