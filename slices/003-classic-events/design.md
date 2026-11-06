# Slice 003 design

## Approach

Four public functions handle the lifecycle: `create_event()`, `answer_invitation()`, `cancel_event()` and `complete_event()`. Each locks the event row, then moves money through `apply_movement()`, in one transaction and with a client request ID. To avoid deadlocks, rows are always locked in the same order: the event first, then users by ID.

Payout maths lives in one SQL function, which gets tested directly with awkward numbers.

`create_event()` takes a `force` option, which only the admin can use. It checks every balance first, so the event is created in full or not at all, with one client request ID covering it. Forced players go straight to `accepted`, and their buy-ins record the admin as the actor.

## Affected components

| Component | Change |
|---|---|
| `supabase/migrations/` | Events tables, functions, policies, updated removal |
| `supabase/functions/admin-users/` | Handles the new removal errors |
| `src/` | Events list, new event form, event detail, Catalan text for event movements |
| `tests/` | Hosted payout, concurrency and removal tests, and the browser smoke test |

## Data changes

- New `events` table: type, name, buy-in, creator, status, payout percentages, results and times. The type is `classic` for now.
- New `event_participants` table: event, user and status (`invited`, `accepted`, `declined` or `lapsed`).

## Decisions

- [ADR 0004](../../docs/adr/0004-money-in-postgres-functions.md) applies. No new ADR.
- Limits follow the artifact: an event name has up to 40 characters.
- A person can be invited with too low a balance. They just can't accept until they have enough.
- A place that rounds down to 0 marcones gets no ledger row, and the event detail still shows it.
- Forced participation is one option per event, not a choice per invitee.
- The rejection returns the usernames that can't pay, and the app words the error in Catalan.

## Tooling needed

A small script that plays demo accounts during reviews, reusing the hosted test helpers. Slices 005 and 007 extend it.

## Risks

| Risk | Mitigation |
|---|---|
| Deadlocks between events and users | One fixed lock order, and a concurrency test |
| Rounding errors create or lose marcones | A test checks that payouts always sum to the pot |
| A forced player loses marcones without agreeing | The human asked for this. The audit shows the admin made the charge |

## How this will be reviewed

On the phone as the admin. Create an event and invite the demo players, and Claude runs a small script that plays their side, so one phone is enough. Then complete it and check the audit. It should take 5 to 10 minutes. Rounding and concurrency are covered by tests.
