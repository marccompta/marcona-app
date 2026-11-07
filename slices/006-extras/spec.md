---
slice: "006"
title: Extras
status: in-review
requirements: [REQ-150, REQ-151, REQ-152, REQ-153, REQ-154]
---

# Slice 006: Extras

## Problem

At the event, everyone will be watching the ranking move, new players need an easy way in, and the site should feel like an app.

## Outcome

Balances, the audit and events update on every phone by themselves. Friends can join by scanning a QR code, and the site can live on the home screen.

## Scope

In this order, each droppable on its own:

1. Live updates for the ranking, audit and events.
2. A QR code on an admin screen.
3. Home screen install.

## Non-goals

- Offline use and push notifications, which aren't in the backlog.
- Removing the refresh from slice 005, which stays as a fallback.

## Requirements

- **REQ-150:** When a balance changes, the system shall refresh the ranking on every logged-in phone without a reload.
- **REQ-151:** When a movement is recorded, the system shall refresh the audit on every logged-in phone without a reload.
- **REQ-152:** When an event changes, the system shall refresh events on every logged-in phone without a reload.
- **REQ-153:** The system shall show a QR code on an admin screen that links to the site.
- **REQ-154:** When a user adds the site to their home screen, the system shall open full screen like an app.

## Acceptance criteria

```gherkin
# REQ-150, REQ-151
Scenario: The ranking and audit update by themselves
  Given two phones are logged in, one on the ranking and one on the audit
  When the admin adds marcones to a user
  Then both phones update without a reload

# REQ-152
Scenario: Events update by themselves
  Given a phone is on Esdeveniments
  When someone accepts an invitation or an event finishes
  Then that phone updates without a reload

# REQ-153
Scenario: Scan to join
  When the admin opens the QR screen and a friend scans it
  Then the friend's phone opens the site

# REQ-154
Scenario: Add to the home screen
  When I add the site to my home screen and open it
  Then it opens full screen, with its own name and icon
```

## Impact on existing behaviour

Screens refresh by themselves instead of on load. Secret choices aren't affected: they stay outside Realtime. No requirements are superseded.

## Open questions

None.
