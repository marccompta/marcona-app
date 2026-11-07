# Slice 008 design

## Approach

`admin_export()` returns everything as JSON, and the app downloads one JSON file plus a CSV of the ledger.

The wipe runs in an `admin-wipe` Edge Function, because deleting Auth users needs the secret key. It checks the admin, the confirmation word and the lock, then calls a private function that deletes the data, and finally deletes the Auth users. The append-only trigger allows deletes only while that function runs, using a transaction-local flag that clients can't set.

## Affected components

| Component | Change |
|---|---|
| `supabase/migrations/` | Export, wipe, lock, updated ledger trigger |
| `supabase/functions/admin-wipe/` | New Edge Function |
| `src/` | Export, wipe and lock on the admin screen |
| `docs/rehearsal-checklist.md`, `docs/day-of-guide.md` | New |
| `.mcp.json` | Trial of `read_only=true` |

## Data changes

The wipe deletes all users except the admin, plus events, choices, ledger rows and request records. It keeps the admin account and the settings. `app_settings` gains the wipe lock.

## Decisions

- [ADR 0004](../../docs/adr/0004-money-in-postgres-functions.md): this is the guarded exception it foresaw.
- The confirmation word is `ESBORRA`.
- The order on the human's side: rehearse, wipe, change the admin password, delete `.env.test.local`, create real accounts, set starting balances, lock the wipe.
- Hosted tests stop after the final wipe, because they'd add test data to the real ledger.
- The human gives the event date during this slice, only to place the freeze.
- REQ-171, REQ-173 and REQ-174 may fall after this slice closes, depending on the date. The slice delivers the steps, and proves the read-only switch works. The guide tracks the real actions.
- A fix during the freeze that needs a migration or function deploy needs read-only lifted, with the human's approval, for that one fix.

## Tooling needed

None. The rehearsal uses real phones.

## Risks

| Risk | Mitigation |
|---|---|
| A wipe during the live event | Typed confirmation, then the lock |
| `read_only=true` breaks the connector, as was recently reported | Try the switch in this slice, not on freeze day |
| The rehearsal finds bugs late | Rehearse straight after this slice is built, and fix before the wipe |
| Export is awkward on an iPhone | It's tested on a real iPhone in the rehearsal |

## Notes from slice 005

The full list is under Gotchas in [its record](../005-confia-o-traeix/record.md).

- **Delete `private.choices` before events and profiles,** because it references both.
- **Leave `public.games` alone,** like `app_settings`. If it's reset, the defaults are: on, 150 / 250 / 0 / 50, with the seeded description.
- **Any wipe ends the game tests that use the demo players:** `tests/hosted/games.test.ts` and the smoke duel in `tests/e2e/smoke.spec.ts` play `demo-nuria` and `demo-pau`, because the admin can't invite test accounts. That includes a rehearsal wipe. This slice must say what happens to those tests.
- **`logInAsDemo()` sets a new password,** which ends that player's session, so these tests can't run while someone is using a demo account.

## How this will be reviewed

On the phone: export, then try the wipe's confirmation. Then follow the rehearsal checklist on real phones, ideally with a friend, which takes longer than a normal review. The final wipe comes after the verdict, because it's the human's call.
