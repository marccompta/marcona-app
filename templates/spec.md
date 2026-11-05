---
slice: "NNN"
title: Short title
status: draft
requirements: [REQ-NNN]
---

# Slice NNN: Short title

## Problem

Why this slice is worth doing, and who it's for.

## Outcome

What someone can do once it's finished.

## Scope

- What's included.

## Non-goals

- What's deliberately left out, and where it goes instead if planned.

## Requirements

Use EARS form, copied from the backlog:

- **REQ-NNN:** When [trigger], the system shall [response].

## Acceptance criteria

At least one per requirement:

```gherkin
# REQ-NNN
Scenario: Short description
  Given [starting state]
  When [action]
  Then [observable result]
```

## Impact on existing behaviour

What changes for existing users or data. List any requirement this supersedes. Write "None" if nothing changes.

## Open questions

Must be empty before Gate 2.
