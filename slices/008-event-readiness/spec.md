---
slice: "008"
title: Event readiness
status: approved
requirements: [REQ-164, REQ-165, REQ-166, REQ-167, REQ-168, REQ-169, REQ-170, REQ-171, REQ-172, REQ-173, REQ-174]
---

# Slice 008: Event readiness

## Problem

A site that works in testing can still fail in a room full of phones. The free plan has no backups, test data has to go, and the human needs a plan for when something breaks.

## Outcome

The site has been rehearsed on real phones and is clean of test data. The human can export everything, and has one page to follow on the day.

## Scope

- Admin export of users, events and ledger movements.
- A confirmed wipe, and a lock that disables it.
- A rehearsal checklist covering every money flow.
- A one-page day-of guide, including the steps before the event.
- A trial of the switch to `read_only=true`.

## Non-goals

- Restoring from an export. It's a record, not a backup system.
- New features. Anything the rehearsal suggests beyond a fix goes to the backlog.

## Requirements

- **REQ-164:** When the admin requests an export, the system shall download all users, events and ledger movements.
- **REQ-165:** When the admin confirms a wipe, the system shall delete the test data. This is the only operation allowed to delete ledger rows.
- **REQ-166:** If a wipe isn't explicitly confirmed, then the system shall change nothing.
- **REQ-167:** If anyone other than the admin requests an export or a wipe, then the system shall reject it.
- **REQ-168:** When the admin locks the wipe for the live event, the system shall reject every later wipe.
- **REQ-169:** Before the feature freeze, the project shall complete a rehearsal on real phones, including iPhone and Android if available, with a checklist of every money flow.
- **REQ-170:** The project shall provide a one-page day-of guide in `docs/` covering a locked-out player, a stuck game and the site going down.
- **REQ-171:** The day before the event, the project shall confirm that the Supabase project is awake.
- **REQ-172:** Before the event, the project shall make `main` what's live on the public site.
- **REQ-173:** From the feature freeze, the project shall accept only fixes.
- **REQ-174:** From the feature freeze, the project shall switch the Supabase MCP server to `read_only=true`.

## Acceptance criteria

```gherkin
# REQ-164
Scenario: Export everything
  When the admin taps export on their phone
  Then a file downloads with all users, events and ledger movements
  And unrevealed choices aren't in it

# REQ-165
Scenario: Wipe the test data
  Given there are test users, events and movements
  When the admin types the confirmation word and confirms
  Then only the admin account and the settings remain
  And the admin has 0 marcones, and old usernames can be used again

# REQ-166
Scenario: A wipe needs confirmation
  When the admin doesn't type the confirmation word exactly
  Then nothing changes

# REQ-167
Scenario: Players can't export or wipe
  Given I'm logged in as a player
  When I call the export or wipe directly
  Then the request is rejected

# REQ-168
Scenario: Lock the wipe
  When the admin locks the wipe
  Then every later wipe is rejected

# REQ-169
Scenario: Rehearse on real phones
  Given the rehearsal checklist
  When we go through it on an iPhone and on an Android if available
  Then every money flow is checked, and the results are recorded

# REQ-170
Scenario: Follow the day-of guide
  When I read the one-page guide
  Then it tells me what to do if a player is locked out, a game gets stuck, or the site goes down

# REQ-171
Scenario: Check the project is awake
  Given it's the day before the event
  When I follow the guide
  Then the Supabase project is confirmed awake

# REQ-172
Scenario: main is live
  Given all slices are merged
  When I open the public URL
  Then the site is built from main

# REQ-173, REQ-174
Scenario: The feature freeze
  Given the freeze has started
  Then only fixes are made
  And the Supabase MCP server is read-only
  And a database fix needs the human to lift read-only for that one fix
```

## Impact on existing behaviour

The wipe is the only exception to the append-only ledger (REQ-059). No requirements are superseded.

## Open questions

None.
