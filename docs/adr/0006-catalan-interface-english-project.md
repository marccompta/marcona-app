# 0006. Catalan interface, English project

- **Status:** accepted
- **Date:** 2026-11-06
- **Slice:** 001

## Context and problem

Every visible word must be natural Catalan and easy to review, while the project's specs, code and history need one working language.

## Options considered

- A single module holding all interface text in Catalan
- A translation library with several locales, which isn't needed for one language

## Decision

The interface is in Catalan, and specs, code and history are in English. All interface text lives in one module, and the glossary maps the terms. Functions return error codes rather than text, and the app turns them into Catalan. The admin's editable game text is the one exception, and it lives in the database.

## Consequences

- Good: all the wording can be reviewed in one file.
- Good: no raw English message can reach a player.
- Bad: every new error code needs a Catalan entry, so a test checks that none is missing.
