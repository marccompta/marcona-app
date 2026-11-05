---
name: slice-close
description: Write the history for an approved slice, update the living docs, and open a PR.
disable-model-invocation: true
---

# Slice close

Input: $ARGUMENTS

The first argument is the slice number. If the input contains `--project <path>`, treat that path as the project root. Otherwise use the repo root. All paths below are relative to the project root, except `templates/`, which is always at the repo root.

## Preconditions

`spec.md` must have `status: accepted`, and the latest `- Verdict:` line in `review.md` must be `approve`. **If either is false, refuse and stop.** Don't offer to work around it.

## Steps

1. Write `record.md` from `templates/record.md`. It must let someone with no memory of this work understand what shipped, why, how it works, and what could break. Use `git log --grep "Slice: NNN"`, your notes on departures, and the review log. Include deviations honestly.
2. Update everything in `docs/system/` that this slice changed, so that those files describe the system as it is now, not how it got there.
3. In `docs/product/backlog.md`, set shipped requirements to `active`, mark superseded ones, and update the roadmap.
4. Set any ADR from this slice to `accepted`, and list it in `docs/adr/README.md`.
5. Add a row to `HISTORY.md`, and add user-facing changes to `CHANGELOG.md`.
6. Update the commands in `AGENTS.md` if how to run or test the project has changed.
7. Think about what repeated or went wrong during this slice. If a skill, rule or hook would prevent it, propose that to the human, and add it only if they agree. Note the outcome under "Tooling lessons" in `record.md`, and update `docs/tooling.md` if something was added.
8. Set `status: closed` in `spec.md`. Do this last: the slice is frozen after this.
9. Run the tests and `python scripts/check_docs.py [project-path]`. Fix any failure outside the slice folder. If the fix is inside the frozen folder, tell the human.
10. Commit. If `AGENTS.md` says `Auto-push: yes`, merge the slice into `main` and push it. Otherwise ask the human before pushing or opening a PR, unless they already told you to.

## Finish

Summarise what was recorded, and suggest the next slice from the roadmap. In fast mode, give the exact `/slice-build` command for it.
