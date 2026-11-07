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
| `kind` | `text` | `admin_adjustment`, `event_buy_in`, `event_refund`, `event_payout` or `roulette_spin` |
| `concept` | `text` | The admin's reason. The only free text |
| `event_id` | `uuid` | The event a buy-in, refund or payout belongs to, references `events` |
| `actor_id` | `uuid` | Who caused it, references `profiles`. A buy-in whose actor isn't its user was forced |
| `details` | `jsonb` | Anything else about the movement, `{}` by default. A classic payout holds its `place`, a game payout its `choice`, and a spin its `choice` and `result` |
| `created_at` | `timestamptz` | Set on insert |

Row Level Security is on. Active users can read the movements of every profile they can see. Triggers reject every update, delete and truncate, even from the owner.

## `public.events`

One row per event, classic or game.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, generated |
| `type` | `text` | `classic` or `game` |
| `name` | `text` | 1 to 40 characters, with no spaces at either end |
| `buy_in` | `bigint` | At least 1 |
| `creator_id` | `uuid` | References `profiles` |
| `status` | `text` | `open`, `completed` or `cancelled`, `open` by default |
| `payout_first`, `payout_second`, `payout_third` | `smallint` | Percentages of 0 or more that sum to 100. Null on a game |
| `results` | `jsonb` | Set on completion: each paid place's `place`, `user_id`, `percentage` and `amount`, including an amount of 0 |
| `created_at` | `timestamptz` | Set on insert |
| `finished_at` | `timestamptz` | When it completed or was cancelled |
| `finished_by` | `uuid` | Who did that, references `profiles`. The creator, on a revealed game |
| `game` | `text` | Which game, references `games`. Null on a classic event |
| `settings` | `jsonb` | A game's own copy of the game's settings, with its `description`. Null on a classic event |
| `phase` | `text` | A game's `inviting`, `choosing` or `revealed`. Null on a classic event |
| `reveal` | `jsonb` | Set at the reveal: `players`, each with `user_id`, `choice`, `percentage` and `payout` |
| `creator_plays` | `boolean` | False when the admin runs a game without playing. True by default |

Row Level Security is on. Active users can read events whose creator they can see, so test accounts and real users each see only their own. Nobody can write from the browser. A trigger rejects every update to a finished event, even from the owner.

## `public.event_participants`

One row per person invited to an event, including its creator.

| Column | Type | Notes |
|---|---|---|
| `event_id` | `uuid` | References `events`. With `user_id`, the primary key |
| `user_id` | `uuid` | References `profiles` |
| `status` | `text` | `invited`, `accepted`, `declined` or `lapsed` |
| `created_at` | `timestamptz` | Set on insert |

Row Level Security is on, with the same reach as `events`. Nobody can write from the browser. A row stays `accepted` after a refund. The pot is the buy-in times the `accepted` rows, and isn't stored.

## `public.app_settings`

Settings the admin can change, one row per area.

| Column | Type | Notes |
|---|---|---|
| `key` | `text` | Primary key. `roulette` is the only row so far |
| `value` | `jsonb` | For `roulette`: `enabled`, `white_one_in` and `max_bet_percent`, starting at `true`, 37 and 5 |
| `updated_at` | `timestamptz` | Set on insert and on each change |

Row Level Security is on, with no policies, and no API role has access. Only public functions read and write it.

## `public.games`

The games the admin can run. New events copy from here.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` | Primary key. `confia_o_traeix` is the only row so far |
| `enabled` | `boolean` | Whether new events can use it, `true` by default |
| `description` | `text` | The Catalan rules, 1 to 1,000 characters |
| `settings` | `jsonb` | For a duel: `both_trust`, `betrayer`, `betrayed` and `both_betray`, starting at 150, 250, 0 and 50 |
| `updated_at` | `timestamptz` | Set on insert and on each change |

Row Level Security is on. Active users can read it, and nobody can write from the browser.

## `private.choices`

Each player's secret choice. It isn't reachable through the API, and it's in no Realtime publication. A cancelled game's choices stay here, and nothing ever reveals them.

| Column | Type | Notes |
|---|---|---|
| `event_id` | `uuid` | References `events`. With `user_id`, the primary key |
| `user_id` | `uuid` | References `profiles` |
| `choice` | `text` | `confia` or `traeix`, replaced by each tap in a duel |
| `lock_order` | `bigint` | Generated, and lower for whoever picked first. A later tap keeps it |

## `private.money_requests`

Remembers each successful money action, so a repeat returns the first result. It isn't reachable through the API.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` | Who sent the action, references `profiles` |
| `request_id` | `uuid` | The client's request ID. With `user_id`, the primary key |
| `action` | `text` | `admin_adjust`, `create_event`, `create_game_event`, `answer_invitation`, `cancel_event`, `complete_event`, `lock_in` or `spin` |
| `result` | `jsonb` | What the first call returned |
| `created_at` | `timestamptz` | Set on insert |

## Functions

- **`public.admin_adjust(p_request_id, p_user_id, p_action, p_amount, p_concept)`:** adds or removes marcones. Only the active admin can call it. It returns the movement ID, the user, the delta and the balance after.
- **`public.create_event(p_request_id, p_name, p_buy_in, p_invitees, p_payout_first, p_payout_second, p_payout_third, p_force)`:** creates an open event, and charges the creator. With `p_force`, which only the admin can use, every invitee joins and pays at once, or nobody does. It returns the event ID.
- **`public.create_game_event(p_request_id, p_game, p_name, p_buy_in, p_plays, p_invitees, p_force)`:** only the admin can call it. It copies the settings, charges the admin if they're playing, and with `p_force` charges every player and starts at once. It returns the event ID.
- **`public.answer_invitation(p_request_id, p_event_id, p_accept)`:** accepts and pays, or declines. On a game, a decline cancels it, and the last acceptance starts the choosing.
- **`public.cancel_event(p_request_id, p_event_id)`:** the creator or the admin cancels an open event, refunds everyone in it and lapses pending invitations.
- **`public.complete_event(p_request_id, p_event_id, p_first, p_second, p_third)`:** the creator pays out an open classic event, and lapses pending invitations. With 2 people, `p_first` takes the pot. It returns the results, and refuses every game.
- **`public.lock_in(p_request_id, p_event_id, p_choice)`:** saves or replaces a player's choice, and reveals when everyone has picked. It returns the event ID, `saved` and `revealed`, and `saved` is false for a tap after the reveal.
- **`public.game_state(p_event_id)`:** a game's status, phase, settings and reveal. Before the reveal it says the same to everyone.
- **`public.set_game_settings(p_game, p_enabled, p_description, p_settings)`:** only the admin can call it, and it refuses values that break the rules.
- **`public.spin(p_request_id, p_choice, p_bet)`:** one roulette spin. It locks the player before claiming the request ID, and returns the movement ID, the choice, the result, whether it won, the bet, the delta and the balance after.
- **`public.roulette_state()`:** the roulette settings, plus the caller's balance and maximum bet.
- **`public.set_roulette_settings(p_enabled, p_white_one_in, p_max_bet_percent)`:** only the admin can call it, and it refuses values out of range.
- **`public.remove_profile(p_user_id)`:** marks a user as removed and declines their invitations, cancelling any duel they were invited to, or refuses if they've accepted an open event. Only the secret key can call it.
- **`public.revoke_sessions(p_user_id)`:** deletes a user's rows in `auth.sessions`. Only the secret key can call it.
- **`public.rls_report()`:** lists tables in the `public` and `private` schemas with Row Level Security off. Only the active admin can read it, and an empty result is the goal.
- **`private.apply_movement(...)`:** the one place a balance changes. It locks the user's row, checks the balance, and writes the ledger row, inside the caller's transaction. It refuses removed users.
- **`private.split_pot(p_pot, p_first, p_second, p_third)`:** the payout maths. Each share rounds down, and the remainder goes to the first paid place.
- **`private.cancel_open_event(p_event, p_actor)`:** what every cancellation does: refunds whoever is in, lapses what's pending and closes the event. The caller holds the event's lock.
- **`private.resolve_game(p_event)`:** reveals and pays a game, branching by game. The caller holds the event's lock.
- **`private.duel_reveal(p_event)`:** each duel player's choice, percentage and payout, from the event's settings. Each payout rounds down.
- **`private.valid_duel_settings(p_settings)`:** checks a duel's numbers, and returns only those four.
- **`private.random_below(p_limit)`:** a whole number from 0 up to the limit, from `gen_random_bytes()`, with no bias.
- **`private.roulette_colour(p_slot, p_white_one_in)`, `private.draw_roulette(p_white_one_in)`:** split 2N slots into 2 white and N - 1 each of red and black, and draw one.
- **`private.max_bet(p_balance, p_percent)`:** the only copy of the maximum bet rule.
- **`private.claim_request()`, `private.finish_request()`:** claim a client request ID, and store what the action returned.
- **`private.is_active()`, `private.is_admin()`, `private.is_test_account()`:** describe the caller, for policies and functions.

Functions raise codes, not sentences, and `src/i18n/errors.ts` turns them into Catalan.

## Outside the migrations

- `public.rls_auto_enable()` and its `ensure_rls` event trigger turn on Row Level Security for new tables in `public`. They were on the project before the first migration, and a migration has since revoked API access to the function.
- `supabase/functions/admin-users/` is deployed through the Supabase MCP server, with `verify_jwt` off because it checks the token itself.
- The admin's Auth user was created in the dashboard, and the Auth settings live there too.
