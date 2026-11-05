# Slice 001 design

## Approach

A small command-line app in two layers: `cli.py` handles arguments and messages, and `store.py` is the only code that touches the database. `tt.py` is a launcher, so the app runs with no install step.

## Affected components

| Component | Change |
|---|---|
| `tt.py` | New launcher |
| `src/tasktracker/cli.py` | New: `add` and `list` commands, `--db` option |
| `src/tasktracker/store.py` | New: creates the database, adds and lists tasks |
| `tests/` | New: tests through the CLI, plus one run as a real process |

## Data changes

A new table, `tasks`, with `id` (auto-incrementing integer key) and `title` (text, required). The database is created on first use, at `tasks.db` in the current folder unless `--db` says otherwise. `PRAGMA user_version` is set to 1, so a later slice can detect this version.

## Decisions

- [ADR 0001](../../docs/adr/0001-use-sqlite-for-storage.md): use SQLite.
- Titles have surrounding spaces removed before saving.
- Only the standard library is used, so there's nothing to install.

## Tooling needed

None.

## Risks

| Risk | Mitigation |
|---|---|
| Open database files block temp folder cleanup in tests on Windows | The store is a context manager and always closes its connection |
| Running from a different folder creates a second `tasks.db` | Accepted for a demo. `--db` chooses the file, and the limitation is listed in the review |

## How this will be reviewed

Commands in a terminal with expected output, using a throwaway database file.
