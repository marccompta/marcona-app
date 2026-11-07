---
slice: "005"
title: Confia o traeix
status: changes-requested
requirements: [REQ-121, REQ-122, REQ-123, REQ-124, REQ-125, REQ-127, REQ-128, REQ-129, REQ-131, REQ-132, REQ-133, REQ-134, REQ-135, REQ-139, REQ-140, REQ-141, REQ-142, REQ-143, REQ-144, REQ-145, REQ-146, REQ-147, REQ-148, REQ-149, REQ-175, REQ-176, REQ-177, REQ-178, REQ-179, REQ-180, REQ-181, REQ-182, REQ-183, REQ-184, REQ-191, REQ-194, REQ-195, REQ-198, REQ-202, REQ-204, REQ-210]
---

# Slice 005: Confia o traeix

## Problem

The hidden choices and betrayal are what make the night special, and they only work if nobody can peek. This slice builds the secret-choice engine and proves it with the first game.

## Outcome

The admin sets up a duel, playing or not. The two players each lock in Confia or Traeix on their phones, and the moment the second one locks in, both see a dramatic reveal and are paid.

## Scope

- Choosing the event type, for the admin only.
- Forced participation for duels.
- The secret-choice engine: lock in, automatic reveal, payout.
- Confia o traeix.
- The game explanation and results on the event detail screen.
- A private choice panel where the last tap counts until both have picked, with lock-ins hidden until the reveal.
- Automatic refresh while a player waits for the reveal.
- Admin game settings, with a worked example.

## Non-goals

- La minoria (slice 007).
- Live updates across the rest of the site (slice 006).
- A limit on duels per pair, because only the admin can create them.
- Letting regular users create games.

## Requirements

- **REQ-121:** If a user creates an event for a game that's turned off, then the system shall reject it.
- **REQ-122:** When a game event is created, the system shall store a copy of that game's current settings with the event.
- **REQ-123:** The system shall take a game's buy-in from the creator and its rules from the settings stored with the event.
- **REQ-124:** If anyone tries to pick a game's winners by hand, then the system shall reject it.
- **REQ-125:** While a game is waiting for choices, the system shall let each accepted participant lock in one secret choice.
- **REQ-127:** When the last player locks in, the system shall reveal all choices and pay out in the same transaction.
- **REQ-128:** While a game is unrevealed, the system shall let nobody read a secret choice, including through the API or Realtime.
- **REQ-129:** When a user opens a game event, the system shall explain the game's rules and payoffs in full.
- **REQ-131:** While a game is unrevealed, the system shall never hint at anyone's choice.
- **REQ-132:** After a game is revealed, the system shall show every choice and payout.
- **REQ-133:** When a game is revealed, the system shall play a dramatic reveal that respects reduced motion.
- **REQ-134:** While a player is waiting for a reveal, the system shall show it without a manual reload, whether or not live updates are built.
- **REQ-135:** When the creator or admin cancels an unrevealed game, the system shall refund every accepted participant.
- **REQ-139:** When a duel has both players, the system shall let each secretly choose Confia or Traeix.
- **REQ-140:** When both players choose Confia, the system shall pay each the both-trust percentage of the buy-in, 150% by default.
- **REQ-141:** When exactly one player chooses Traeix, the system shall pay that player the betrayer percentage, 250% by default, and the other the betrayed percentage, 0% by default.
- **REQ-142:** When both players choose Traeix, the system shall pay each the both-betray percentage, 50% by default.
- **REQ-143:** The system shall round each duel payout down to a whole number.
- **REQ-144:** If duel settings don't satisfy betrayer > both trust > both betray ≥ betrayed, then the system shall reject them.
- **REQ-145:** The system shall show duel payouts as normal ledger movements, with the house covering or keeping any difference.
- **REQ-146:** When the admin turns a game on or off, the system shall apply it to new events.
- **REQ-147:** When the admin edits a game's Catalan description or numbers, the system shall save them for new events.
- **REQ-148:** While the admin edits a game's numbers, the system shall show a worked example that updates as they change.
- **REQ-149:** When admin settings change, the system shall leave existing events unchanged.
- **REQ-175:** When the admin creates an event, the system shall let them choose classic or any game that's turned on.
- **REQ-176:** If anyone other than the admin tries to create a game event, then the system shall reject it.
- **REQ-177:** The system shall offer only classic events to users other than the admin.
- **REQ-178:** When the admin creates a game event, the system shall let them choose whether to play in it.
- **REQ-179:** When the admin creates a game event as a player, the system shall make them an accepted participant and charge them the buy-in.
- **REQ-180:** If the admin creates a game event as a player and their balance is below the buy-in, then the system shall reject the event.
- **REQ-181:** When the admin creates a game event without playing, the system shall charge them nothing and leave them out of the players.
- **REQ-182:** The system shall run Confia o traeix as a duel between exactly two players: the admin and one invited opponent, or two invited players.
- **REQ-183:** When an invited player declines a duel, the system shall cancel the event and refund anyone who has paid.
- **REQ-184:** When an invited player of a duel is removed, the system shall cancel the event and refund anyone who has paid.
- **REQ-191:** When the admin creates a duel with forced participation, the system shall charge every player and go straight to choosing.
- **REQ-194:** While a duel is unrevealed, the system shall tell nobody whether another player has locked in, through any screen, the API or Realtime.
- **REQ-195:** While a duel is unrevealed, the system shall show a player the same resting screen whether or not they've locked in, so a glance at their phone reveals nothing.
- **REQ-198:** When a player opens the private choice panel in a duel, the system shall show both choice buttons, looking the same whether or not they've locked in.
- **REQ-202:** When a player taps a choice button in a duel, the system shall save that choice at once, with no confirmation step, replacing any earlier choice of theirs.
- **REQ-204:** If a duel tap arrives after both players have picked, then the system shall leave the choices as they were and show the reveal.
- **REQ-210:** When a duel tap is saved, the system shall make the outer border of that button glow clearly for 0.7 seconds, and shall give no other feedback.

## Acceptance criteria

```gherkin
# REQ-175, REQ-177
Scenario: Only the admin can choose a game
  Given Confia o traeix is turned on
  When the admin opens the new event form
  Then they can choose classic or Confia o traeix
  When a player opens the new event form
  Then they can only create a classic event

# REQ-176
Scenario: Players can't create a game through the API
  Given I'm logged in as a player
  When I call the game creation function directly
  Then the request is rejected

# REQ-121
Scenario: A game that's off can't be created
  Given Confia o traeix is turned off
  When the admin tries to create one
  Then they see a Catalan error

# REQ-178, REQ-179
Scenario: The admin plays
  Given the admin has 100 marcones
  When they create a duel with a buy-in of 10, choose to play, and invite "anna"
  Then they're a participant and have 90 marcones

# REQ-180
Scenario: The admin plays without enough marcones
  Given the admin has 5 marcones
  When they create a duel with a buy-in of 10 and choose to play
  Then they see a Catalan error
  And no event is created

# REQ-181
Scenario: The admin runs a game without playing
  When the admin creates a duel with a buy-in of 10, chooses not to play, and invites "anna" and "bea"
  Then the admin isn't charged
  And the admin isn't listed as a player

# REQ-182
Scenario: A duel has exactly two players
  When the admin plays and invites 2 people, doesn't play and invites 1 or 3, or picks the same person twice
  Then they see a Catalan error
  And no event is created

# REQ-123, REQ-124
Scenario: Nobody picks a game's winner
  Given a duel with a buy-in of 10
  When anyone calls the complete function on it
  Then the request is rejected
  And only the rules stored with the event decide the payouts

# REQ-122, REQ-149
Scenario: Settings changes leave running games alone
  Given a running duel created when both-trust was 150%
  When the admin changes both-trust to 120%
  Then that duel still pays 150%
  And a new duel pays 120%

# REQ-183
Scenario: A player declines
  Given "anna" has paid into a duel and "bea" is invited
  When "bea" declines
  Then the event is cancelled and "anna" is refunded

# REQ-184
Scenario: An invited player is removed
  Given "anna" has paid into a duel and "bea" is invited
  When "bea" is removed
  Then the event is cancelled and "anna" is refunded

# REQ-125, REQ-139, REQ-202, REQ-210
Scenario: Pick with one tap
  Given both players are in a duel
  When I open the private panel and tap Confia or Traeix
  Then my choice is saved at once, with no confirmation step
  And the outer border of that button glows clearly for 0.7 seconds, then goes back to normal
  And nothing else on the screen changes

# REQ-202, REQ-210
Scenario: The last tap counts
  Given I've picked Confia and the other player hasn't picked
  When I tap Traeix
  Then my choice is now Traeix
  And the border of the Traeix button glows for 0.7 seconds
  When I tap Confia, then Traeix, quickly on a slow connection
  Then my choice is still Traeix

# REQ-204
Scenario: A tap after both have picked
  Given both players have picked and the duel is revealed
  When a late tap arrives
  Then the revealed choices don't change
  And that player sees the reveal

# REQ-127
Scenario: Automatic reveal
  Given one player has locked in
  When the other locks in, even at the same moment
  Then the game reveals and pays out exactly once, in one transaction

# REQ-128
Scenario: Choices stay secret
  Given a player has locked in
  When anyone else tries to read that choice through the API, a function or Realtime
  Then they get nothing

# REQ-129, REQ-131
Scenario: Before the reveal
  When I open a duel that hasn't been revealed
  Then I see the rules and payoffs in full
  And nothing hints at another player's choice

# REQ-132, REQ-145
Scenario: After the reveal
  When a duel is revealed
  Then I see every choice and payout
  And the payouts appear as normal movements in the audit

# REQ-133
Scenario: A dramatic reveal
  When a duel is revealed on my phone
  Then the result is dramatic, and it respects reduced motion

# REQ-134
Scenario: Waiting for the other player
  Given I've locked in and I'm on the event screen
  When the other player locks in
  Then I see the reveal without reloading

# REQ-135
Scenario: Cancel a stuck game
  Given a duel where one player never chooses
  When the admin cancels it
  Then both players are refunded

# REQ-140, REQ-141, REQ-142, REQ-143
Scenario Outline: Pay the duel
  Given a duel with a buy-in of 11 and the default settings
  When the choices are <choices>
  Then the payouts are <payouts>

  Examples:
    | choices         | payouts |
    | Confia, Confia  | 16, 16  |
    | Traeix, Confia  | 27, 0   |
    | Traeix, Traeix  | 5, 5    |

# REQ-144
Scenario: Reject invalid duel settings
  When the admin sets both-betray above both-trust, or any other order that breaks the rule
  Then they see a Catalan error
  And the settings don't change

# REQ-146, REQ-147
Scenario: Manage a game
  When the admin turns a game off, or edits its Catalan description or numbers
  Then new events use those settings

# REQ-148
Scenario: See a worked example
  When the admin changes a number
  Then the worked example updates straight away

# REQ-191
Scenario: Force a duel
  Given "anna" and "bea" each have 20 marcones
  When the admin creates a duel with a buy-in of 10, doesn't play, picks them both and forces participation
  Then both are charged and can lock in straight away

# REQ-194
Scenario: Nobody can tell who has locked in
  Given a duel that hasn't been revealed
  When "anna" locks in
  Then "bea" and the admin see no change on any screen
  And the API returns exactly what it returned before
  And no public table changes

# REQ-195
Scenario: A glance at a phone gives nothing away
  Given "anna" has locked in and "bea" hasn't
  When I compare their resting event screens
  Then they look the same

# REQ-198
Scenario: The panel gives nothing away
  Given "anna" has locked in and "bea" hasn't
  When each opens the private panel
  Then both see the same two buttons, and neither sees a choice
```

## Impact on existing behaviour

- The new event form gains a type choice, for the admin only. Classic events work as before for everyone.
- Removal now cancels a duel if the removed user was an invited player.
- REQ-120, REQ-136, REQ-137 and REQ-138 are superseded by REQ-175, REQ-182, REQ-183 and REQ-184 before anything was built, so no behaviour changes for users.
- REQ-130 is superseded by REQ-197, which keeps it for La minoria only. Duels hide lock-ins instead (REQ-194).
- REQ-196 is superseded by REQ-198, and REQ-199, REQ-200 and REQ-201 by REQ-202, REQ-203 and REQ-204, before anything was built, so no behaviour changes for users.
- REQ-126 is superseded by REQ-205, which keeps final choices for La minoria only.
- REQ-203 is superseded by REQ-210, at the human's request in the review of this slice, before it closed: the glow lasts 0.7 seconds instead of two, and lights only the outer border.

## Open questions

None.
