# Backlog

Every requirement has a permanent ID. Raw input is kept in `docs/product/intake/`.

**Status:** `proposed`, `planned`, `active` (shipped), `superseded by REQ-NNN`, or `dropped`.
**Verification:** `test` (a test must cite the ID) or `manual` (checked at human review only).

## Requirements

| ID | Requirement | Status | Slice | Verification |
|---|---|---|---|---|
| REQ-001 | When the user runs `add` with a non-blank title, the system shall store a new task and show its ID. | planned | 001 | test |
| REQ-002 | If the user runs `add` with a blank title, then the system shall show an error, exit with a non-zero code, and store nothing. | planned | 001 | test |
| REQ-003 | When the user runs `list`, the system shall show all tasks in the order they were added, with their IDs and titles. | planned | 001 | test |
| REQ-004 | The system shall keep tasks between runs. | planned | 001 | test |
| REQ-005 | When the user runs `list` and there are no tasks to show, the system shall say so. | planned | 001 | test |
| REQ-006 | When the user runs `done` with the ID of an open task, the system shall mark that task as done. | planned | 002 | test |
| REQ-007 | When the user runs `list`, the system shall show only open tasks. Supersedes REQ-003 once slice 002 closes. | planned | 002 | test |
| REQ-008 | When the user runs `list --all`, the system shall show all tasks, and mark the done ones. | planned | 002 | test |
| REQ-009 | If the user runs `done` with an unknown ID, then the system shall show an error and exit with a non-zero code. | planned | 002 | test |
| REQ-010 | When the system opens a database from an earlier version, it shall upgrade it without losing tasks. | planned | 002 | test |
| REQ-011 | When the user runs `serve`, the system shall show tasks on a read-only web page on localhost. | planned | 003 | test |

## Slice roadmap

| Slice | Goal | Requirements | Status |
|---|---|---|---|
| 001 | Add tasks and list them, and keep them between runs | REQ-001 to REQ-005 | in-review |
| 002 | Complete tasks, and keep the list uncluttered | REQ-006 to REQ-010 | planned |
| 003 | See tasks in a browser | REQ-011 | planned |
