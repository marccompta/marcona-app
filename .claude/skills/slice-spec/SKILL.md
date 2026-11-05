---
name: slice-spec
description: Write the spec, design and tasks for a planned slice.
disable-model-invocation: true
---

# Slice spec

Input: $ARGUMENTS

The first argument is the slice number. If the input contains `--project <path>`, treat that path as the project root. Otherwise use the repo root. All paths below are relative to the project root, except `templates/`, which is always at the repo root.

## Steps

1. Read `AGENTS.md`, everything in `docs/system/`, `HISTORY.md`, `docs/tooling.md`, and this slice's entry in `docs/product/backlog.md`. Open the records and ADRs of any earlier slice this one touches, and check the code it affects.
2. Create `slices/NNN-short-slug/` with `spec.md`, `design.md` and `tasks.md` from `templates/`. If the folder already exists from a rejected attempt, read why it was rejected, and create a new slice number instead. Say how the new spec addresses the rejection.
3. Fill in the spec:
   - Copy requirements from the backlog, in EARS form.
   - Write at least one Gherkin acceptance criterion per requirement.
   - State non-goals.
   - List any effect on existing behaviour or data.
4. Fill in the design. Include "Tooling needed" and "How this will be reviewed". If a decision is significant or hard to reverse, add an ADR with status `proposed` and link it.
5. Break the work into ordered tasks. Each task should be small, leave tests passing, and name the requirements it covers.
6. Check the slice against the Definition of Ready in `docs/workflow.md`. Resolve open questions by asking the human.

## Stop at Gate 2

If `/intake` is running these steps in fast mode, skip this stop, because it asks for one approval at the end.

Otherwise, summarise the slice: what it delivers, what it leaves out, the approach, and any risks. Ask the human to approve or change it.

After they approve, set `status: approved` in `spec.md` and update the roadmap in the backlog. Don't start building until the human runs `/slice-build`.
