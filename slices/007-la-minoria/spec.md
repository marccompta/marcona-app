---
slice: "007"
title: La minoria
status: accepted
requirements: [REQ-155, REQ-156, REQ-157, REQ-158, REQ-160, REQ-161, REQ-162, REQ-163, REQ-185, REQ-192, REQ-193, REQ-197, REQ-205]
---

# Slice 007: La minoria

## Problem

Duels only involve two people. La minoria gives the whole group a game to play at once, on the same engine.

## Outcome

The admin sets up a game for 3 or more players and starts it. Everyone secretly picks a side, and the smaller side splits the pot.

## Scope

- La minoria as a game type, for the admin only.
- The start step, and forced participation.
- Payouts, remainders, ties and refunds.
- Editable option labels in the admin game settings.

## Non-goals

- More than two options.
- Any change to duels.

## Requirements

- **REQ-155:** The system shall run La minoria as a group game for 3 or more players.
- **REQ-156:** While at least 3 people have accepted a La minoria event, the system shall let the creator start it.
- **REQ-157:** If anyone else tries to start La minoria, or fewer than 3 have accepted, then the system shall reject it.
- **REQ-158:** When the creator starts La minoria, the system shall lapse its pending invitations.
- **REQ-160:** When the admin edits the option labels, the system shall use them for new events.
- **REQ-161:** When both options are chosen and one side is smaller, the system shall split the whole pot equally among that side, rounded down.
- **REQ-162:** When a La minoria split leaves a remainder, the system shall give it to whoever on the smaller side locked in first.
- **REQ-163:** If the sides tie, or everyone picks the same option, then the system shall refund everyone.
- **REQ-185:** The system shall count the admin towards La minoria's 3 players only if they're playing.
- **REQ-192:** When the admin creates a La minoria event with forced participation, the system shall charge every player and start it at once.
- **REQ-193:** When La minoria has started, the system shall let each player secretly pick one of two options, labelled Blanc and Negre by default.
- **REQ-197:** While a La minoria game is unrevealed, the system shall show who has locked in.
- **REQ-205:** If a player tries to change a locked-in choice in La minoria, then the system shall reject it.

## Acceptance criteria

```gherkin
# REQ-155, REQ-156, REQ-185
Scenario Outline: Start with at least 3 players
  Given the admin <plays> and <accepted> invited players have accepted
  Then the game <result> be started

  Examples:
    | plays         | accepted | result |
    | is playing    | 2        | can    |
    | isn't playing | 3        | can    |
    | isn't playing | 2        | can't  |

# REQ-157
Scenario: Nobody else can start it
  Given enough players have accepted
  When a player calls the start function directly
  Then the request is rejected

# REQ-158
Scenario: Invitations lapse at the start
  Given "anna" hasn't answered
  When the admin starts the game
  Then their invitation has lapsed and they aren't charged

# REQ-193
Scenario: Pick a side in secret
  Given the game has started
  When I pick Blanc or Negre and lock it in
  Then I'm shown as locked in, and nobody else can read my choice

# REQ-160
Scenario: Edit the labels
  When the admin renames the options
  Then new events use the new labels
  And running events keep theirs

# REQ-161
Scenario: The smaller side splits the pot
  Given 5 players paid a buy-in of 10
  When 2 pick Blanc and 3 pick Negre
  Then each Blanc player receives 25 and the Negre players receive nothing

# REQ-162
Scenario: The remainder goes to the first to lock in
  Given 7 players paid a buy-in of 5
  When 3 pick the smaller side
  Then the first of them to lock in receives 13, and the other two receive 11

# REQ-163
Scenario Outline: Refund on a tie or a unanimous choice
  When the choices are <choices>
  Then everyone is refunded

  Examples:
    | choices           |
    | 2 Blanc, 2 Negre  |
    | 4 Blanc, 0 Negre  |

# REQ-192
Scenario: Force La minoria
  Given 3 invited players who can afford the buy-in
  When the admin creates the game and forces participation
  Then all 3 are charged and the game has started, with no start step

# REQ-197
Scenario: See who has locked in
  Given the game has started
  When a player locks in
  Then everyone can see that they've locked in, but not their choice

# REQ-205
Scenario: A choice is final
  Given I've locked in Blanc
  When I try to lock in Negre
  Then the request is rejected
```

## Impact on existing behaviour

The admin's event type choice gains La minoria, and the game settings gain its description and labels. REQ-159 is superseded by REQ-193, and REQ-126 by REQ-205, before anything was built, so no behaviour changes for users.

## Open questions

None.
