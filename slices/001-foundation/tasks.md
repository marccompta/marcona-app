# Slice 001 tasks

Work through these in order. Each task leaves the tests passing.

- [ ] **T1:** Scaffold Vite, React and TypeScript with the base path and hash routes. Set up Vitest and Playwright, and add the commands to `AGENTS.md`. (REQ-001, REQ-002)
- [ ] **T2:** Build 2 or 3 phone-sized visual directions as static pages, render them to `evidence/`, and show them to the human to pick from. (REQ-028)
- [ ] **T3:** Check install commands against official docs, install the tooling, add `.mcp.json`, and write `docs/tooling.md`. (REQ-029, REQ-034)
- [ ] **T4:** Write `docs/setup.md`, then walk the human through it one step at a time, checking each. (REQ-030)
- [ ] **T5:** Add the deploy workflow for `main` and `slice/**`, and add unit tests and the build to CI. (REQ-001, REQ-033)
- [ ] **T6:** Add the first migration: `profiles`, Row Level Security and `rls_report()`. Test anonymous reads and sign-up. (REQ-008, REQ-009, REQ-010, REQ-032)
- [ ] **T7:** Add the language layer: the text module, `lang="ca"`, `Intl` helpers, plurals and error mapping. (REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-019)
- [ ] **T8:** Apply the chosen direction: tokens, self-hosted fonts, the app shell and the tab bar. (REQ-012, REQ-013, REQ-020, REQ-021, REQ-022, REQ-023, REQ-024, REQ-025, REQ-026, REQ-027)
- [ ] **T9:** Add login, failed login, session persistence and logout. (REQ-003, REQ-004, REQ-005, REQ-006, REQ-007)
- [ ] **T10:** Add the ranking's styled empty state. (REQ-011)
- [ ] **T11:** Add a test that scans the repository for secrets. (REQ-031)

## Review fixes

Added by `/slice-verdict`, one task per review item, e.g. **R1.1** for round 1, item 1.
