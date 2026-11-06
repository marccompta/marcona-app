# Slice 004 design

## Approach

A public `spin()` function locks the player's row, checks the bet against their current balance and the settings, draws the result, and writes one ledger movement, all in one transaction and with a client request ID. The browser only animates the result it gets back.

The draw uses `gen_random_bytes()` with rejection sampling, so there's no bias. The admin sets white as "1 in N". The draw picks from 2N slots: 2 are white, and the rest are split equally between red and black. With N of 37, that gives exactly 18, 18 and 1 in 37.

## Affected components

| Component | Change |
|---|---|
| `supabase/migrations/` | Settings table, `spin()`, the draw and settings functions |
| `src/` | Ruleta tab and animation, admin roulette settings, Catalan text for spins |
| `tests/` | Hosted spin, limit and distribution tests, plus unit and browser tests |

## Data changes

A new `app_settings` table holds a key and a JSON value, starting with `roulette`: on or off, N, and the maximum bet percentage. Only admin functions write to it. Spins use the existing ledger, with the choice and result in its details.

## Decisions

- [ADR 0004](../../docs/adr/0004-money-in-postgres-functions.md) applies, and [ADR 0005](../../docs/adr/0005-server-decided-admin-run-games.md) covers secure randomness. No new ADR.
- A win is one movement of +bet, and a loss is one movement of -bet.
- Valid ranges: N from 2 to 1000, and a maximum bet from 1% to 100%, in whole numbers.
- The Ruleta tab stays visible when the table is closed, and it shows a Catalan message.

## Tooling needed

None. `gen_random_bytes()` comes from `pgcrypto`, which Supabase provides.

## Risks

| Risk | Mitigation |
|---|---|
| The animation shows something other than the real result | The wheel's stopping point is calculated only from the server's result |
| A slow network makes the wheel seem stuck | It starts spinning on tap, and it settles when the result arrives |
| A distribution test fails by chance | It uses wide limits on a server-side sample, not exact counts |

## How this will be reviewed

On the phone as a demo player: spin a few times, then check the balance and audit. Then, as the admin, change the settings and close the table. It should take 5 minutes. Limits and odds are covered by tests.
