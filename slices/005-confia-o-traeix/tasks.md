# Slice 005 tasks

Work through these in order. Each task leaves the tests passing.

- [x] **T1:** Add the `games` table, event phases and the settings copy. (REQ-121, REQ-122, REQ-149)
- [x] **T2:** Add `create_game_event()`: admin-only, playing or not, exactly two different players, and forced participation. (REQ-123, REQ-176, REQ-178, REQ-179, REQ-180, REQ-181, REQ-182, REQ-191)
- [x] **T3:** Update invitations and removal for duels, and reject completing a game by hand. (REQ-124, REQ-183, REQ-184)
- [x] **T4:** Add `private.choices` and `lock_in()`, where each tap replaces the last until both have picked. (REQ-125, REQ-139, REQ-202, REQ-204)
- [x] **T5:** Add `private.resolve_game()` with the duel payouts, and reveal in the same transaction. (REQ-127, REQ-140, REQ-141, REQ-142, REQ-143, REQ-145)
- [x] **T6:** Add `game_state()`, and test that choices and lock-ins stay hidden through the API, functions and Realtime. (REQ-128, REQ-194)
- [x] **T7:** Refund locked-in players when a game is cancelled. (REQ-135)
- [x] **T8:** Add the event type choice for the admin only, and the option to play. (REQ-175, REQ-177, REQ-178)
- [ ] **T9:** Build the game event detail: rules, payoffs, one resting screen for everyone, the private choice panel, taps sent in order, the two-second glow and no hints. (REQ-129, REQ-131, REQ-195, REQ-198, REQ-202, REQ-203)
- [ ] **T10:** Add the waiting refresh, results and dramatic reveal. (REQ-132, REQ-133, REQ-134)
- [ ] **T11:** Build the admin game settings, with validation and the worked example, and extend the smoke test. (REQ-144, REQ-146, REQ-147, REQ-148)

## Review fixes

Added by `/slice-verdict`, one task per review item, e.g. **R1.1** for round 1, item 1.
