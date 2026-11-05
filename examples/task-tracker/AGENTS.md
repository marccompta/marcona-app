# Agent instructions: task tracker demo

This is a worked example of the workflow in the repo root's `AGENTS.md`, and all the rules there apply here. Run skills against it with `--project examples/task-tracker`.

## Read before changing anything

1. This file.
2. `docs/system/`: what is true now.
3. `HISTORY.md`: the timeline of slices.
4. Only the `slices/NNN-*/record.md` files and `docs/adr/` entries relevant to the work.

## Commands

Run these from `examples/task-tracker`.

| Purpose | Command |
|---|---|
| Run the app | `python tt.py --help` |
| Run tests | `python -m unittest discover` |
| Check docs | `python ../../scripts/check_docs.py .` |

## How this demo differs from a real project

- Slices are committed on the repo's setup branch rather than on `slice/NNN-slug` branches.
- Gates 1 and 2 were covered by approving the plan that defined these slices. Gate 3 reviews are real.
