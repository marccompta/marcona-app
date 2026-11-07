---
name: slice-review
description: Prepare human review instructions for a built slice and hand it over for a verdict.
disable-model-invocation: true
---

# Slice review

Input: $ARGUMENTS

The first argument is the slice number. If the input contains `--project <path>`, treat that path as the project root. Otherwise use the repo root. All paths below are relative to the project root, except `templates/`, which is always at the repo root.

## Preconditions

All tasks in `tasks.md` must be checked and the tests must pass. If not, stop and say why.

## Steps

1. Work out what a reviewer can actually observe in this slice, and pick the review methods that fit. The table in `docs/workflow.md` lists them, and a slice can mix several. Don't default to commands if a person would judge the result better by seeing it.
   - If the review needs a deployed site, push the slice's branch when `AGENTS.md` says `Auto-push: yes`. Otherwise ask the human before pushing.
2. Write `review.md` from `templates/review.md`, keeping its seven sections.
   - Assume the reader didn't see the build. Commands must be complete, copyable, and work in the human's shell.
   - Give the expected result for every step, using real output you've observed.
   - Add one checklist row per acceptance criterion.
   - Put screenshots and sample output in `evidence/`, and link them.
   - Never include secrets. Name the environment variable or vault entry.
3. Run every instruction exactly as written, from a clean state, and fix anything that doesn't match. If you can't run a step, say so in section 5.
4. Run the tests and `python scripts/check_docs.py [project-path]`, and record the real results in section 5.
   - If the project has `tests/sql/constraints.sql` and this slice added a migration, run that file through the Supabase MCP server's `execute_sql`. It always ends in an exception, which rolls it back and carries the results. Every entry should say "rejected". Record the result in section 5.
5. Ask the `slice-auditor` subagent to follow `review.md` with no other context. Fix what it reports, and record the outcome in section 5.
6. Set `status: in-review`. Commit `review.md` and any evidence.

### After a `changes` round

Add a new `### Round N` entry to the review log, and rewrite sections 3 and 4 to cover only what changed, plus a regression check on anything the fixes could have affected. The earlier instructions stay in git history.

## Stop at Gate 3

Give the human the path to `review.md`, a two-line summary of what to check, and how long it should take. Then wait. Never fill in a verdict.
