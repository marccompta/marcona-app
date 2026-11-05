---
name: slice-verdict
description: Record the human's review verdict on a slice and act on it.
disable-model-invocation: true
---

# Slice verdict

Input: $ARGUMENTS

The arguments are the slice number, a verdict (`approve`, `changes` or `reject`), and optional notes. If the input contains `--project <path>`, treat that path as the project root. Otherwise use the repo root. All paths below are relative to the project root.

A verdict is valid only if it comes from the human's own message. If the verdict is missing or unclear, ask.

`spec.md` must have `status: in-review`. If it doesn't, stop and say why.

Fill in the latest round of the review log in `review.md`, with today's date and the human's notes, keeping their wording. Then:

## approve

Set `- Verdict: approve` and `status: accepted`, then commit.

- **Standard mode:** tell the human to run `/slice-close NNN`.
- **Fast mode:** carry straight on with the steps in `.claude/skills/slice-close/SKILL.md`.

The mode is the `Mode:` line under "Workflow settings" in the project's `AGENTS.md`. If there's no such line, it's `standard`.

## changes

1. Set `- Verdict: changes`, and number each note as an item.
2. Compare each item with the acceptance criteria. If it goes beyond them, it's new scope. Ask the human to choose: send it to `/intake`, or widen this slice by amending the spec.
3. If something is unclear, ask before writing tasks.
4. Add each in-scope item to "Review fixes" in `tasks.md` as `R<round>.<item>`.
5. Set `status: changes-requested`, and commit.
6. Fix the items using the `/slice-build` steps, including a test for each one that can be tested. Then prepare the next round using the `/slice-review` steps.

## reject

1. Set `- Verdict: reject`, with the human's reason. If they gave none, ask, because this reason is what stops the idea being retried blindly.
2. Set `status: rejected`. Add a "Rejected" row to `HISTORY.md`, linking to the slice.
3. Commit the slice folder and history to the main line, without the slice's code. Leave the code branch unmerged.
4. Ask the human to choose: re-spec this work as a new slice at Gate 2, or drop it and return its requirements to the backlog as `proposed` or `dropped`.
