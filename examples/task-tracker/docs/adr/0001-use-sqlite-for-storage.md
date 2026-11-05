# 0001. Use SQLite for storage

- **Status:** proposed
- **Date:** 2026-11-04
- **Slice:** 001

## Context and problem

Tasks must survive between runs (REQ-004). Later slices will add fields to tasks and read them from a web page. The demo should need no installs.

## Options considered

- A JSON file
- SQLite, through Python's built-in `sqlite3` module
- A database server

## Decision

Use SQLite. It needs no install, writes safely, and has a built-in version number (`PRAGMA user_version`) that later slices can use for upgrades. A JSON file would need hand-written safe saving and version handling, and a server is far more than one person's task list needs.

## Consequences

- Good: one file holds all the data, so it's easy to back up, delete or inspect.
- Good: adding a field later is a small, testable migration.
- Bad: it's designed for one computer, which rules out syncing without further work. Syncing is out of scope.
