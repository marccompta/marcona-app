# Constraint checks

`tests/sql/constraints.sql` tries what only the database owner can try, because the grants stop everyone else first. It ran on the hosted project on 2026-11-07, through the Supabase MCP server's `execute_sql`.

The script always ends by raising an exception, so everything it did was rolled back. The exception message carries the results:

| Check | Result |
|---|---|
| REQ-056: make a second admin | rejected |
| REQ-061: store a negative balance directly | rejected |
| REQ-061: apply a movement that goes below 0 | rejected |
| REQ-061: insert a ledger row with a negative balance after it | rejected |
| REQ-059: update a ledger row as the owner | rejected |
| REQ-059: delete a ledger row as the owner | rejected |
| REQ-059: truncate the ledger as the owner | rejected |

This check isn't part of `npm run test:hosted`, because that command has no owner-level access. Run it again after any migration that touches these tables.
