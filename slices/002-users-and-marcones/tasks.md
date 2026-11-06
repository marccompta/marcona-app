# Slice 002 tasks

Work through these in order. Each task leaves the tests passing.

- [x] **T1:** Add the active-user helpers, `is_test`, and the one-admin index. (REQ-053, REQ-056)
- [x] **T2:** Add the ledger, `apply_movement()`, the balance constraint and the append-only trigger. (REQ-057, REQ-059, REQ-060, REQ-061)
- [x] **T3:** Add `admin_adjust()` with client request IDs and validation. (REQ-039, REQ-040, REQ-041, REQ-042, REQ-043, REQ-062)
- [x] **T4:** Lock down direct writes, and test them with a player's session. (REQ-058)
- [x] **T5:** Add the `admin-users` Edge Function for creating users, with its validation. (REQ-035, REQ-036, REQ-037, REQ-038, REQ-054, REQ-055)
- [ ] **T6:** Add password reset, proving that it ends sessions. (REQ-044, REQ-045)
- [ ] **T7:** Add removal, proving revocation and that an unexpired token is rejected. (REQ-048, REQ-049, REQ-050, REQ-051, REQ-052, REQ-053)
- [ ] **T8:** Build the admin screen, with two-step removal and no password controls for players. (REQ-046, REQ-047)
- [ ] **T9:** Build the ranking and user detail screens. (REQ-063, REQ-064, REQ-065, REQ-066)
- [ ] **T10:** Build the audit with its filter. (REQ-067, REQ-068, REQ-069)
- [ ] **T11:** Add chip stacks and count-up numbers. (REQ-070)

## Review fixes

Added by `/slice-verdict`, one task per review item, e.g. **R1.1** for round 1, item 1.
