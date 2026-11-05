---
slice: "001"
title: Add and list tasks
status: in-review
requirements: [REQ-001, REQ-002, REQ-003, REQ-004, REQ-005]
---

# Slice 001: Add and list tasks

## Problem

There's nowhere to keep tasks yet. The smallest useful version lets a person write a task down and find it again later.

## Outcome

Someone can add tasks from the terminal, list them, close the terminal, and still find them the next time.

## Scope

- An `add` command that takes a title.
- A `list` command.
- Storage in a local database file, with a `--db` option to choose the file.

## Non-goals

- Completing tasks (slice 002).
- A browser view (slice 003).
- Editing or deleting tasks, due dates and priorities. These aren't in the backlog.

## Requirements

- **REQ-001:** When the user runs `add` with a non-blank title, the system shall store a new task and show its ID.
- **REQ-002:** If the user runs `add` with a blank title, then the system shall show an error, exit with a non-zero code, and store nothing.
- **REQ-003:** When the user runs `list`, the system shall show all tasks in the order they were added, with their IDs and titles.
- **REQ-004:** The system shall keep tasks between runs.
- **REQ-005:** When the user runs `list` and there are no tasks to show, the system shall say so.

## Acceptance criteria

```gherkin
# REQ-001
Scenario: Add a task
  Given an empty task list
  When I run add with the title "Buy milk"
  Then I see "Added task 1: Buy milk"

# REQ-002
Scenario: Reject a blank title
  Given an empty task list
  When I run add with a title of only spaces
  Then I see an error saying the title can't be blank
  And the exit code is not zero
  And the list is still empty

# REQ-003
Scenario: List tasks in the order they were added
  Given I added "Buy milk" and then "Call the bank"
  When I run list
  Then I see "1. Buy milk" followed by "2. Call the bank"

# REQ-004
Scenario: Tasks survive between runs
  Given I added "Buy milk" in one run of the program
  When I run list in a separate run
  Then I see "1. Buy milk"

# REQ-005
Scenario: Nothing to show
  Given an empty task list
  When I run list
  Then I see "No tasks."
```

## Impact on existing behaviour

None. This is the first slice.

## Open questions

None.
