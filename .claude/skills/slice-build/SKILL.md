---
name: slice-build
description: Implement an approved slice task by task, test first.
disable-model-invocation: true
---

# Slice build

Input: $ARGUMENTS

The first argument is the slice number. If the input contains `--project <path>`, treat that path as the project root. Otherwise use the repo root. All paths below are relative to the project root.

## Preconditions

`spec.md` must have `status: approved`, or `changes-requested` when fixing review items, or `building` when resuming a build an earlier session started. If it doesn't, stop and say why.

Read the `Mode:` line under "Workflow settings" in the project's `AGENTS.md`. If there's no such line, the mode is `standard`.

## Resuming an interrupted build

If `status` is already `building`, or the branch `slice/NNN-short-slug` already exists, an earlier session started this build and may have stopped mid-task. Before writing anything:

1. Switch to the branch and look at the working tree. Uncommitted changes belong to the task that was in progress: read them, then finish or undo them on purpose, with an edit, never `git checkout <file>`.
2. Compare the ticked tasks in `tasks.md` with `git log --grep "Slice: NNN"`. Every ticked task should have its commit, and no unticked task should.
3. If the project has `supabase/migrations/`, compare those files with the hosted list from the Supabase MCP server's `list_migrations`. Every file should be applied under the same version, and nothing applied should lack a file. A migration applied with no file means a task stopped between applying and saving it: recover its definition from the database before going on, and never apply it twice.
4. Tell the human what state the build was in and what you'll do next, then carry on from the first unticked task. Departure notes from the earlier session are lost with it, so recover what you can from its commits for `record.md`, and say what couldn't be recovered.

## Steps

1. Read `spec.md`, `design.md` and `tasks.md`, plus the test commands in `AGENTS.md`.
   - **In fast mode,** this spec may be older than the slices closed since it was approved. Compare it with `docs/system/`, `HISTORY.md` and those slices' records. If anything changes what the human approved, update `spec.md`, `design.md` and `tasks.md`, tell the human what changed, and wait for their OK. If only internal details change, update the design and carry on.
2. Create or switch to the branch `slice/NNN-short-slug`. Set `status: building`.
3. For each unchecked task, in order:
   - Write a failing test that cites the requirement ID in its name or a comment. If the requirement's verification is `manual`, skip this.
   - Write the least code that passes it.
   - Run the full test suite.
   - Check off the task, and commit using Conventional Commits with a `Slice: NNN` trailer.
4. Keep a note of every departure from the design, with the reason, for `record.md`. If a departure changes what the human approved, stop and ask.
5. If you notice something out of scope, add it to the backlog as `proposed` and carry on. Don't build it.
6. When all tasks are done, run the full test suite and `python scripts/check_docs.py [project-path]`.

## Finish

Don't merge. Don't push here: `/slice-review` handles any push the review needs.

- **Standard mode:** report which tasks are done, the test results, and any departures. Tell the human to run `/slice-review NNN`.
- **Fast mode:** if everything passes, carry straight on with the steps in `.claude/skills/slice-review/SKILL.md`, and include any departures in your handover. If anything fails, stop and report it.
