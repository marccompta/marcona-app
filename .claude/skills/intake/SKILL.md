---
name: intake
description: Turn a list of requirements into backlog entries and proposed vertical slices.
disable-model-invocation: true
---

# Intake

Input: $ARGUMENTS

If the input contains `--project <path>`, treat that path as the project root. Otherwise use the repo root. All paths below are relative to the project root.

If no requirements were given, ask for them and stop.

If the human asks for fast lane, set `Mode: fast` under "Workflow settings" in the project's `AGENTS.md`. Then read the mode from that file. If there's no `Mode:` line, the mode is `standard`.

## Steps

1. Read `docs/product/vision.md`, `docs/product/backlog.md`, `docs/system/capabilities.md` and `HISTORY.md`.
2. Save the raw input, word for word, to `docs/product/intake/YYYY-MM-DD-short-topic.md`. Add a "Clarifications" section for step 4.
3. Rewrite each requirement in EARS form. Split any that contain more than one behaviour. Give each the next free `REQ-NNN`. Never reuse an ID, including those of dropped or superseded requirements.
4. Look for ambiguities, gaps and conflicts with existing behaviour. Ask the human about them, all at once, and record the answers under "Clarifications". Don't guess.
5. When a new requirement changes an existing one, set the old one's status to `superseded by REQ-NNN`, and state this in your summary.
6. Group requirements into vertical slices. Each slice must deliver something a person can see and judge, working end to end. Prefer several thin slices to one thick one. Order them by value and dependency. Reject layer-by-layer slices such as "build the database".
7. Update `docs/product/backlog.md`, setting new requirements to `proposed`. If this is the first intake, fill in `docs/product/vision.md` from what you've learned, and add new terms to `docs/system/glossary.md`.

## Standard mode: stop at Gate 1

Show the proposed slices in order, each with its goal and requirement IDs, and list anything you assumed. Ask the human to approve or adjust them.

After they approve, set the requirements in the approved slices to `planned`. Don't start on specs until the human runs `/slice-spec`.

## Fast mode: one combined stop for Gates 1 and 2

1. Once the questions from step 4 are answered, follow the steps in `.claude/skills/slice-spec/SKILL.md` for every proposed slice, in order, without stopping between them. Keep specs and designs short, but meet the Definition of Ready.
2. Show one summary: the slices in order, each with its goal, requirement IDs and what it leaves out, followed by the approach, risks and anything you assumed.
3. Ask the human to approve or adjust it. Don't continue without their approval.
4. After they approve, set the requirements to `planned`, set every spec to `status: approved`, and update the roadmap in the backlog.
5. Commit the intake, backlog and specs, then tell the human to run `/slice-build` for the first slice.
