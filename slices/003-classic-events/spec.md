---
slice: "003"
title: Classic events
status: accepted
requirements: [REQ-071, REQ-072, REQ-073, REQ-074, REQ-075, REQ-076, REQ-077, REQ-078, REQ-079, REQ-080, REQ-081, REQ-082, REQ-083, REQ-084, REQ-085, REQ-086, REQ-087, REQ-088, REQ-089, REQ-090, REQ-091, REQ-092, REQ-093, REQ-094, REQ-095, REQ-096, REQ-097, REQ-098, REQ-099, REQ-100, REQ-186, REQ-187, REQ-188, REQ-189, REQ-190]
---

# Slice 003: Classic events

## Problem

Marcones need to change hands between friends. Classic events are the core of the night, and the last must-have before the site is useful.

## Outcome

Anyone can create an event, invite friends and collect buy-ins. The creator can then pay out the winners or cancel, and every marcona is accounted for.

## Scope

- Creating, accepting, declining, cancelling and completing classic events.
- Payouts, refunds and rounding.
- The events list and event detail screens.
- The removal rules that depend on events.
- Forced participation, an option only the admin has.
- A phone-sized smoke test of the main flows.

## Non-goals

- Game events (slices 005 and 007).
- Live refresh of the events screens (slice 006).
- Letting the admin complete someone else's event. The admin can cancel it instead.

## Requirements

- **REQ-071:** When a user submits a valid classic event with a name, buy-in, invitees, and payout percentages for 1st, 2nd and 3rd, the system shall create it as open.
- **REQ-072:** When a classic event is created, the system shall make the creator an accepted participant and charge them the buy-in.
- **REQ-073:** The system shall default the payout percentages to 50, 30 and 20.
- **REQ-074:** If the payout percentages don't sum to 100, then the system shall reject the event. A place may be 0%.
- **REQ-075:** If a buy-in isn't a whole number of at least 1, then the system shall reject the event.
- **REQ-076:** If the creator's balance is below the buy-in, then the system shall reject the event.
- **REQ-077:** If an event has no invitees, then the system shall reject it.
- **REQ-078:** The system shall let the creator invite only other active users.
- **REQ-079:** When an invited user accepts, the system shall charge the buy-in immediately and make them an accepted participant.
- **REQ-080:** If an invited user's balance is below the buy-in when they accept, then the system shall reject the acceptance and leave them invited.
- **REQ-081:** When an invited user declines, the system shall record the decline without charging them.
- **REQ-082:** If a user answers an invitation that's no longer pending, then the system shall reject the answer.
- **REQ-083:** The system shall hold every event in one of three states, open, completed or cancelled, and shall allow only open to change.
- **REQ-084:** When the creator cancels an open event, the system shall cancel it and refund every accepted participant.
- **REQ-085:** When the admin cancels any open event, the system shall cancel it and refund every accepted participant.
- **REQ-086:** If anyone else tries to cancel an event, then the system shall reject it.
- **REQ-087:** If a participant who has paid tries to withdraw, then the system shall reject it.
- **REQ-088:** While a classic event is open with at least 2 accepted participants, counting the creator, the system shall let the creator complete it.
- **REQ-089:** If anyone else tries to complete an event, or fewer than 2 people have accepted, then the system shall reject it.
- **REQ-090:** The system shall calculate the pot as the buy-in times the number of accepted participants.
- **REQ-091:** When the creator completes a classic event with exactly 2 accepted participants, the system shall have them pick a winner and pay that person the whole pot.
- **REQ-092:** When the creator completes a classic event with 3 or more accepted participants, the system shall require a different participant for each place with a percentage above 0.
- **REQ-093:** When a classic event with 3 or more participants is paid out, the system shall round each share down and give the remainder to the first paid place, so the total equals the pot.
- **REQ-094:** When an event completes or is cancelled, the system shall lapse its pending invitations.
- **REQ-095:** When a user is removed, the system shall decline their pending invitations.
- **REQ-096:** If a user has accepted an open event, then the system shall block their removal.
- **REQ-097:** When a user opens Esdeveniments, the system shall group events into invitations for them, open events and past events.
- **REQ-098:** When a user opens an event, the system shall show its buy-in, pot, payout rule, participants and status, with a crown on the creator and a pill status tag.
- **REQ-099:** The system shall record every buy-in, refund and payout as a ledger movement linked to its event.
- **REQ-100:** The project shall include a smoke test of the main flows on a phone-sized screen, extended by each later slice.
- **REQ-186:** The system shall offer the option to force participation to the admin on every new event, and to nobody else.
- **REQ-187:** If anyone other than the admin asks to force participation, then the system shall reject it.
- **REQ-188:** When the admin creates a classic event with forced participation, the system shall make every invitee an accepted participant and charge them the buy-in at once, without waiting for them to accept.
- **REQ-189:** If any forced player's balance is below the buy-in, then the system shall reject the event, name those players, and charge nobody.
- **REQ-190:** The system shall show each forced buy-in in the audit as made by the admin.

## Acceptance criteria

```gherkin
# REQ-071, REQ-072, REQ-073
Scenario: Create a classic event
  Given I have 100 marcones
  When I open the new event form
  Then the percentages start at 50, 30 and 20
  When I create "Pòquer" with a buy-in of 10 and invite "anna"
  Then the event is open, I'm a participant, and I have 90 marcones

# REQ-074, REQ-075, REQ-076, REQ-077
Scenario Outline: Reject an invalid event
  When I create an event with <problem>
  Then I see a Catalan error
  And no event is created and nothing is charged

  Examples:
    | problem                          |
    | percentages that sum to 90       |
    | a buy-in of 0 or 1.5             |
    | a buy-in above my balance        |
    | no invitees                      |

# REQ-078
Scenario: Invite only other active users
  When I open the invitee list
  Then I see active users
  And I don't see myself or removed users

# REQ-079
Scenario: Accept an invitation
  Given "anna" has 20 marcones and an invitation with a buy-in of 10
  When they accept
  Then they're a participant and have 10 marcones

# REQ-080
Scenario: Accept without enough marcones
  Given "anna" has 5 marcones and an invitation with a buy-in of 10
  When they accept
  Then they see a Catalan error
  And they stay invited with 5 marcones

# REQ-081
Scenario: Decline an invitation
  When "anna" declines
  Then they aren't charged
  And they show as declined

# REQ-082, REQ-094
Scenario: Pending invitations lapse
  Given "anna" has a pending invitation
  When the event completes or is cancelled
  Then their invitation has lapsed
  And they can no longer answer it

# REQ-083
Scenario: Finished events can't change
  Given a completed or cancelled event
  When anyone tries to accept, cancel or complete it
  Then the request is rejected

# REQ-084, REQ-085
Scenario: Cancel an open event
  Given an open event with 3 participants
  When its creator or the admin cancels it
  Then all 3 are refunded

# REQ-086, REQ-087
Scenario: Others can't cancel, and nobody can withdraw
  Given I'm a participant but not the creator
  When I try to cancel the event or withdraw from it
  Then the request is rejected
  And nothing is refunded

# REQ-088, REQ-089
Scenario: Only the creator completes, with at least 2 in
  Given I'm the only accepted participant
  Then I can't complete the event
  When someone else tries to complete an event
  Then the request is rejected

# REQ-090, REQ-091
Scenario: Two players
  Given the creator and "anna" paid a buy-in of 10
  When the creator picks "anna" as the winner
  Then "anna" receives the pot of 20

# REQ-092
Scenario: Each paid place needs a different player
  Given an event with 3 participants
  When the creator picks the same person for 1st and 2nd
  Then the request is rejected

# REQ-093
Scenario Outline: Round down and keep the total exact
  Given a pot of 21 and percentages <percentages>
  When the event is completed
  Then the payouts are <payouts>

  Examples:
    | percentages | payouts   |
    | 50, 30, 20  | 11, 6, 4  |
    | 0, 60, 40   | 0, 13, 8  |
    | 100, 0, 0   | 21, 0, 0  |

# REQ-095
Scenario: Removal declines pending invitations
  Given "anna" has a pending invitation
  When they are removed
  Then their invitation shows as declined

# REQ-096
Scenario: Removal is blocked by an open event
  Given "anna" has accepted an open event
  When the admin tries to remove them
  Then the admin sees a Catalan error
  And they stay active

# REQ-097
Scenario: See the events list
  When I open Esdeveniments
  Then I see my invitations, open events and past events in separate groups

# REQ-098
Scenario: See an event
  When I open an event
  Then I see its buy-in, pot, payout rule and participants
  And the creator has a crown, and the status is a pill tag

# REQ-099
Scenario: Events appear in the audit
  When a buy-in, refund or payout happens
  Then it appears in the audit, linked to its event

# REQ-100
Scenario: Smoke test
  When the smoke test runs on a phone-sized screen
  Then it logs in, creates an event, accepts it, completes it and checks the ranking

# REQ-186, REQ-187
Scenario: Only the admin can force participation
  When the admin opens the new event form
  Then they see the option to force participation
  When a player opens the form
  Then they don't see it
  When a player calls the function directly with that option
  Then the request is rejected

# REQ-188
Scenario: Force participation
  Given "anna" and "bea" each have 20 marcones
  When the admin creates an event with a buy-in of 10, invites them and forces participation
  Then both are participants straight away, with 10 marcones each
  And neither has an invitation to answer, and neither can withdraw
  And the admin can complete the event without waiting

# REQ-189
Scenario: A forced player can't afford the buy-in
  Given "anna" has 20 marcones and "bea" has 5
  When the admin creates that event
  Then the admin sees a Catalan error naming "bea"
  And no event is created and nobody is charged

# REQ-190
Scenario: The audit shows who forced it
  When a buy-in is forced
  Then the audit shows it on the player's balance, made by the admin
```

## Impact on existing behaviour

Removal gains two rules: it declines pending invitations, and it's blocked while the user has accepted an open event. The admin can also charge a player a buy-in without their acceptance, using forced participation. No requirements are superseded.

## Open questions

None.
