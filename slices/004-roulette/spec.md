---
slice: "004"
title: Roulette
status: in-review
requirements: [REQ-101, REQ-102, REQ-103, REQ-104, REQ-105, REQ-106, REQ-107, REQ-108, REQ-109, REQ-110, REQ-111, REQ-112, REQ-113, REQ-114, REQ-115, REQ-116, REQ-117, REQ-118, REQ-119]
---

# Slice 004: Roulette

## Problem

Between events, people need something to play on their own. Roulette is the first game of chance, and it proves the server can decide outcomes fairly.

## Outcome

A player opens the Ruleta tab, picks red or black, bets up to their limit, watches the wheel, and sees the result in their balance and the audit. The admin can tune or close the table.

## Scope

- The Ruleta tab, the spin and its animation.
- Bet limits, enforced on the server.
- Roulette settings on the admin screen.

## Non-goals

- Betting on white or on numbers. Only red and black can be chosen.
- Live refresh of other phones (slice 006).

## Requirements

- **REQ-101:** The system shall offer roulette from its own tab.
- **REQ-102:** When a user chooses red or black and a valid bet and spins, the system shall resolve the spin on the server.
- **REQ-103:** The system shall decide every spin with a secure random source on the server.
- **REQ-104:** The system shall default the odds to red 18 in 37, black 18 in 37 and white 1 in 37.
- **REQ-105:** When the result matches the chosen colour, the system shall double the bet, a net gain equal to the bet.
- **REQ-106:** When the result is the other colour or white, the system shall take the bet.
- **REQ-107:** If a bet isn't a whole number of at least 1, then the system shall reject it.
- **REQ-108:** The system shall set the maximum bet to the configured percentage of the player's current balance, 5% by default, rounded down and never below 1.
- **REQ-109:** The system shall show the player's current maximum bet on the roulette screen.
- **REQ-110:** If a bet exceeds the maximum or the player's balance, then the server shall reject it.
- **REQ-111:** When a spin resolves, the system shall record one ledger movement that shows the choice and the result in the audit.
- **REQ-112:** The system shall animate only the result it receives from the server.
- **REQ-113:** The system shall show a satisfying wheel or chip animation for each spin.
- **REQ-114:** Where the device asks for reduced motion, the system shall show the result without the spin animation.
- **REQ-115:** When the admin changes the white chance, the system shall use it for later spins.
- **REQ-116:** When the admin changes the maximum bet percentage, the system shall use it for later spins.
- **REQ-117:** When the admin turns roulette off or on, the system shall apply it to later spins.
- **REQ-118:** While roulette is off, the system shall reject spins.
- **REQ-119:** If the admin enters invalid roulette settings, then the system shall reject them.

## Acceptance criteria

```gherkin
# REQ-101, REQ-102, REQ-112
Scenario: Spin the wheel
  Given I have 100 marcones
  When I open the Ruleta tab, pick red, bet 5 and spin
  Then the server returns the result
  And the wheel lands on exactly that result

# REQ-103, REQ-104
Scenario: Fair odds from a secure source
  Given the default settings
  When many spins are drawn on the server
  Then red and black each land near 18 in 37 and white near 1 in 37
  And the draw uses a secure random source

# REQ-105
Scenario: Win
  Given I have 100 marcones and bet 5 on red
  When the result is red
  Then I have 105 marcones

# REQ-106
Scenario Outline: Lose
  Given I have 100 marcones and bet 5 on red
  When the result is <result>
  Then I have 95 marcones

  Examples:
    | result |
    | black  |
    | white  |

# REQ-107
Scenario: Reject a badly formed bet
  When I bet 0 or 1.5
  Then I see a Catalan error
  And my balance doesn't change

# REQ-108, REQ-109
Scenario Outline: See the maximum bet
  Given I have <balance> marcones
  When I open the Ruleta tab
  Then the maximum bet shown is <maximum>

  Examples:
    | balance | maximum |
    | 100     | 5       |
    | 39      | 1       |
    | 1       | 1       |

# REQ-110
Scenario: The server enforces the limit
  Given I have 100 marcones, or 0
  When I call the spin function directly with a bet above the maximum or my balance
  Then the request is rejected

# REQ-111
Scenario: One spin, one movement
  When I spin
  Then one ledger movement is recorded
  And the audit shows my choice and the result

# REQ-113
Scenario: A satisfying spin
  When I spin on my phone
  Then the wheel or chip animation feels good

# REQ-114
Scenario: Reduced motion
  Given my device asks for reduced motion
  When I spin
  Then I see the result without the spin animation

# REQ-115, REQ-116
Scenario: Change the odds and the limit
  When the admin sets white to 1 in 10 and the maximum bet to 10%
  Then later spins use those values
  And players see the new maximum

# REQ-117, REQ-118
Scenario: Close the table
  When the admin turns roulette off
  Then spins are rejected
  When the admin turns it back on
  Then spins work again

# REQ-119
Scenario: Reject invalid settings
  When the admin enters a white chance or a maximum bet out of range
  Then they see a Catalan error
  And the settings don't change
```

## Impact on existing behaviour

The Ruleta tab's placeholder becomes the real screen, and the audit gains spins. No requirements are superseded.

## Open questions

None.
