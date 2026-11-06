# 0003. Supabase Auth with hidden emails, and privileged actions in Edge Functions

- **Status:** proposed
- **Date:** 2026-11-06
- **Slice:** 001

## Context and problem

People should see only a username and password, but removing a user needs real sessions. Anyone holding the public key can call the Auth API directly.

## Options considered

- Supabase Auth, with each username mapped to a hidden placeholder email
- Base64 or home-made credentials, which give no real sessions

## Decision

Supabase Auth, with public sign-ups disabled. Creating, removing and resetting users run in Edge Functions, with the secret key stored only in Supabase. Roles live in our own table, because users can edit their own Auth metadata.

## Consequences

- Good: real sessions, hashed passwords and rate limiting.
- Good: the secret key never reaches the browser or the repo.
- Bad: access tokens stay valid until they expire, so every function and policy must also check that the user is active.
- Bad: Supabase has no setting to stop users changing their own password through its public API. We accept this, offer no such screen, and turn on "Require current password".
