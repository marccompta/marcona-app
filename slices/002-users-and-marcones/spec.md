---
slice: "002"
title: Users and marcones
status: in-review
requirements: [REQ-035, REQ-036, REQ-037, REQ-038, REQ-039, REQ-040, REQ-041, REQ-042, REQ-043, REQ-044, REQ-045, REQ-046, REQ-047, REQ-048, REQ-049, REQ-050, REQ-051, REQ-052, REQ-053, REQ-054, REQ-055, REQ-056, REQ-057, REQ-058, REQ-059, REQ-060, REQ-061, REQ-062, REQ-063, REQ-064, REQ-065, REQ-066, REQ-067, REQ-068, REQ-069, REQ-070]
---

# Slice 002: Users and marcones

## Problem

The site has a login but nothing to track. This slice adds the people and the money, and the protections every later slice relies on.

## Outcome

The admin can create and remove users, reset passwords, and add or remove marcones. Everyone can see the ranking, anyone's movements, and the audit.

## Scope

- The admin screen for users and marcones.
- Privileged user actions in an Edge Function.
- The ledger, balances, row locks and client request IDs.
- The active-user check on every function and policy.
- The ranking, user detail and audit screens, with chip stacks and count-up numbers.

## Non-goals

- Removal rules that depend on events, which are in slice 003.
- Live refresh of these screens (slice 006).
- Self-service password changes, which are out of scope.

## Requirements

- **REQ-035:** When the admin submits a valid new username and password, the system shall create the user with 0 marcones.
- **REQ-036:** If a new username isn't 3 to 20 characters of lowercase `[a-z0-9_-]`, then the system shall reject it.
- **REQ-037:** If a new username matches an existing user, including a removed one, then the system shall reject it.
- **REQ-038:** If a new password is shorter than Supabase's minimum length, then the system shall reject it.
- **REQ-039:** When the admin adds marcones to a user with a Concept, the system shall raise that user's balance and record a ledger movement.
- **REQ-040:** When the admin removes marcones from a user with a Concept, the system shall lower that user's balance and record a ledger movement.
- **REQ-041:** If an admin adjustment has no Concept, then the system shall reject it.
- **REQ-042:** If an admin adjustment isn't a whole number of at least 1, then the system shall reject it.
- **REQ-043:** If an admin removal would take a balance below 0, then the system shall reject it and change nothing.
- **REQ-044:** When the admin resets a user's password, the system shall set the new password.
- **REQ-045:** When the admin resets a user's password, the system shall end that user's sessions.
- **REQ-046:** The system shall offer password changes only to the admin.
- **REQ-047:** When the admin starts removing a user, the system shall ask for a second confirmation before acting.
- **REQ-048:** When the admin confirms a removal, the system shall soft-delete the user and block their login.
- **REQ-049:** When a user is removed, the system shall revoke their sessions.
- **REQ-050:** When a user is removed, the system shall take them out of the ranking.
- **REQ-051:** When a user is removed, the system shall keep their history in the audit.
- **REQ-052:** If the admin tries to remove themselves, then the system shall reject it.
- **REQ-053:** While a user is removed, every function and policy shall reject them, even if their access token hasn't expired.
- **REQ-054:** The system shall create, remove and reset users only through Edge Functions, with the secret key stored only in Supabase.
- **REQ-055:** If anyone other than the active admin calls an admin function, then the system shall reject the request.
- **REQ-056:** The system shall allow exactly one admin.
- **REQ-057:** The system shall make every change to marcones in a single Postgres function, in one transaction, with row locks.
- **REQ-058:** If a client writes directly to any table with the public key, then the system shall reject the write.
- **REQ-059:** If anyone tries to update or delete a ledger row, then the system shall reject it.
- **REQ-060:** The system shall store the balance after each movement on its ledger row.
- **REQ-061:** If a movement would take a balance below 0, then a database constraint shall stop it.
- **REQ-062:** When a money action is submitted again with the same client request ID, the system shall return the first result and apply the action only once.
- **REQ-063:** When a user opens the ranking, the system shall list active users and their balances, highest first.
- **REQ-064:** While two users have the same balance, the system shall order them alphabetically in the ranking.
- **REQ-065:** The system shall show medals for the top three places in the ranking.
- **REQ-066:** When a user taps someone in the ranking, the system shall show that person's balance and every movement involving them.
- **REQ-067:** When a user opens the audit, the system shall show all movements in one timeline, newest first.
- **REQ-068:** When a user picks a person in the audit filter, the system shall show only that person's movements.
- **REQ-069:** The system shall show who, the amount, the concept or event, the balance after, and the timestamp on each audit row.
- **REQ-070:** The system shall show balances as chip stacks with count-up numbers.

## Acceptance criteria

```gherkin
# REQ-035
Scenario: Create a user
  Given I'm logged in as the admin
  When I create user "anna" with a valid password
  Then "anna" can log in
  And "anna" has 0 marcones

# REQ-036
Scenario: Reject a badly formed username
  When I create a user called "AB" or "anna!"
  Then I see a Catalan error
  And no user is created

# REQ-037
Scenario: Usernames are never reused
  Given "anna" was removed
  When I create a user called "anna"
  Then I see a Catalan error

# REQ-038
Scenario: Reject a short password
  When I create a user with a password below Supabase's minimum
  Then I see a Catalan error
  And no user is created

# REQ-039, REQ-060
Scenario: Add marcones
  Given "anna" has 10 marcones
  When I add 5 with the Concept "Benvinguda"
  Then "anna" has 15 marcones
  And the ledger row shows +5, the Concept and a balance after of 15

# REQ-040
Scenario: Remove marcones
  Given "anna" has 10 marcones
  When I remove 4 with the Concept "Correcció"
  Then "anna" has 6 marcones

# REQ-041, REQ-042
Scenario: Reject a bad adjustment
  When I submit an adjustment with no Concept, or an amount of 0 or 1.5
  Then I see a Catalan error
  And nothing changes

# REQ-043, REQ-061
Scenario: A balance can't go below 0
  Given "anna" has 3 marcones
  When I remove 5
  Then I see a Catalan error
  And "anna" still has 3 marcones
  And a direct attempt to store a negative balance is stopped by a database constraint

# REQ-044, REQ-045
Scenario: Reset a password
  Given "anna" is logged in on a phone
  When I reset their password
  Then the new password works and the old one doesn't
  And their session on that phone has ended

# REQ-046
Scenario: Players get no password screen
  Given I'm logged in as a player
  Then nothing in the app lets me change a password

# REQ-047
Scenario: Removal needs two steps
  When I tap remove on "anna"
  Then nothing happens until I confirm a second time

# REQ-048, REQ-049, REQ-050, REQ-051
Scenario: Remove a user
  Given "anna" is logged in and has movements
  When I confirm the removal
  Then they can't log in, and their sessions are revoked
  And they aren't in the ranking
  And their movements are still in the audit

# REQ-052
Scenario: The admin can't remove themselves
  When I try to remove my own account
  Then I see a Catalan error

# REQ-053
Scenario: Removal takes effect immediately
  Given "anna" holds an access token that hasn't expired
  When they are removed
  Then any table read or function call with that token is rejected

# REQ-054
Scenario: Privileged actions stay on the server
  When I check how users are created, removed and reset
  Then each goes through an Edge Function
  And the secret key is stored only in Supabase

# REQ-055
Scenario: Players can't call admin functions
  Given I'm logged in as a player
  When I call an admin function directly
  Then the request is rejected

# REQ-056
Scenario: There's one admin
  When anything tries to create a second admin
  Then the database rejects it

# REQ-057
Scenario: Two actions at once
  Given "anna" has 10 marcones
  When two removals of 6 are submitted at the same moment
  Then exactly one succeeds
  And "anna" has 4 marcones

# REQ-058, REQ-059
Scenario: The ledger can't be tampered with
  Given I hold the public key and a player's session
  When I try to write to any table, or update or delete a ledger row
  Then the request is rejected

# REQ-062
Scenario: A double tap applies once
  Given "anna" has 10 marcones
  When the same adjustment of +5 is sent twice with one client request ID
  Then both calls return the same result
  And "anna" has 15 marcones, with one ledger row

# REQ-063, REQ-064, REQ-065
Scenario: See the ranking
  Given "zoe" has 50, "anna" has 20 and "bea" has 20
  When I open the ranking
  Then I see zoe, anna, bea in that order
  And the top three have medals

# REQ-066
Scenario: See a user's detail
  When I tap "anna" in the ranking
  Then I see their balance and every movement on it

# REQ-067, REQ-068, REQ-069
Scenario: Read the audit
  When I open the audit
  Then I see all movements, newest first
  And each shows who, the amount, the concept, the balance after and the time
  When I filter by "anna"
  Then I see only their movements

# REQ-070
Scenario: Balances look like chips
  When a balance appears on screen
  Then it shows as a chip stack, and the number counts up
```

## Impact on existing behaviour

The ranking now lists users, and the empty state only shows until a second user exists. No requirements are superseded.

## Open questions

None.
