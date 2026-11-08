# Agent instructions

This project is built in vertical slices using spec-driven development. Each slice is specified, built, reviewed by a human, and recorded, so that a future session with no memory can extend the project safely.

## Read before changing anything

Read in this order, and stop as soon as you have enough context:

1. This file.
2. `docs/system/`: what is true **now**. This is the source of truth for current behaviour.
3. `HISTORY.md`: the timeline of slices.
4. Only the `slices/NNN-*/record.md` files and `docs/adr/` entries relevant to the work.

If a closed slice disagrees with `docs/system/`, `docs/system/` wins. Closed slices describe the past.

## Workflow

Each step is a skill that the human invokes. Details are in `docs/workflow.md`.

| Step | Skill | Ends with |
|---|---|---|
| Requirements into backlog and slices | `/intake` | Gate 1: human approves the slicing |
| Spec, design and tasks | `/slice-spec NNN` | Gate 2: human approves the spec |
| Build | `/slice-build NNN` | All tasks done, tests pass |
| Prepare the human review | `/slice-review NNN` | Gate 3: human gives a verdict |
| Record the verdict and act on it | `/slice-verdict NNN approve\|changes\|reject [notes]` | Accepted, or fixes, or rejected |
| Write history and finish | `/slice-close NNN` | Closed, PR opened |

All skills accept `--project <path>` to work on a project other than the repo root, for example `--project examples/task-tracker`.

## Workflow settings

Skills read these lines from the project's `AGENTS.md`. A missing line means the default shown here. Fast mode changes which steps stop for the human, as described under "Fast lane" in `docs/workflow.md`.

- Mode: fast
- Auto-push: yes

## Hard rules

- **Never give or assume a human verdict.** Record a verdict only from the human's own message. Never mark a gate as passed on their behalf.
- **Closed slices are frozen.** Don't edit anything in a slice whose status is `closed`. Correct mistakes with a new slice.
- **Requirement IDs are permanent.** Never reuse or renumber a `REQ-NNN`. A changed requirement gets a new ID that supersedes the old one.
- **ADRs are append-only.** Supersede an ADR with a new one; only its status line may change.
- **Stay in scope.** Build what the spec says. New ideas go to the backlog, not into the current slice.
- **Test first where the output can be tested.** Tests cite the requirement IDs they cover.
- **Never put secrets in the repo.** That includes `review.md` and `.mcp.json`. Refer to an environment variable or vault entry by name.
- **Report honestly.** If a step wasn't run or a check failed, say so in the review or record.

## Commits

Use Conventional Commits, with a trailer linking the commit to its slice:

```
feat(tasks): add task creation

Slice: 001
```

## Commands

| Purpose | Command |
|---|---|
| Check docs and traceability | `python scripts/check_docs.py [project-path]` |
| Run the app locally | `npm run dev` |
| Build, including the type check | `npm run build` |
| Unit tests | `npm test` |
| Browser tests, phone-sized | `npm run test:e2e` |
| Browser tests against the deployed site | `E2E_BASE_URL=https://marccompta.github.io/marcona-app/ npm run test:e2e` |
| Tests against the hosted Supabase project, from this machine only | `npm run test:hosted` |
| Play the demo accounts during a review, from this machine only | `npm run demo -- fund 100`, which cancels every open event first, `status`, `give <player> <amount>`, `accept [event] [player]`, `decline [event] [player]`, `invite <event> <buy-in>` or `pick <event> <confia\|traeix> [player]` |
| Redraw the home screen icons, after changing their design | `npx tsx scripts/make-icons.ts` |
| Rules only the database owner can test, after any migration touching them | Run `tests/sql/constraints.sql` through the Supabase MCP server's `execute_sql` |
| Payout maths and forced participation, after any migration touching them | Run `tests/sql/events.sql` through the Supabase MCP server's `execute_sql` |
| Roulette odds and white, after any migration touching them | Run `tests/sql/roulette.sql` through the Supabase MCP server's `execute_sql` |
| Game rules and duel payouts, after any migration touching them | Run `tests/sql/games.sql` through the Supabase MCP server's `execute_sql` |
| La minoria's rules, payouts and labels, after any migration touching games | Run `tests/sql/minoria.sql` through the Supabase MCP server's `execute_sql` |

Write long scripts as files, then run them. Long heredocs break in Git Bash here, especially with apostrophes.

Commands the human runs in PowerShell, such as those in `review.md`, say `npm.cmd` and `npx.cmd`, because this machine's script policy blocks plain `npm` and `npx`. Claude's own shell bypasses the policy, so test those commands with `powershell.exe -NoProfile -ExecutionPolicy Restricted`.

## Testing

- **Retrying checks wait out anything that expires.** A glow, an animation or a celebration ends by itself, so a retrying `expect` can pass on broken code. This happened once in slice 004 and three times in slice 005. To prove something is absent or finished, read it once with `getAttribute` or `count()`. To prove it never happened, set up a `MutationObserver` before the action. Read a style mid-effect only after the fade, and time things in the browser.
- **Prove a new test by breaking the code on purpose.** Check that the break compiled, because a break that fails at the build proves nothing. Commit first, and undo the break with an edit, never `git checkout <file>`, which also throws away uncommitted work. That happened once in slice 006.
- **Never assume live settings in tests on the real project.** The admin changes them during reviews. Read the numbers from the duel's `settings` or from `roulette_state()`.

## Where things go

- `docs/product/`: vision, backlog, raw intake notes.
- `docs/system/`: current capabilities, architecture, data model, glossary.
- `docs/adr/`: architecture decisions.
- `docs/tooling.md`: when to use a skill, subagent, hook, MCP server, and so on, and what's installed.
- `slices/NNN-slug/`: everything about one slice.
- `templates/`: starting point for each document.
- `examples/task-tracker/`: a complete worked example. It isn't part of the app, so don't import from it or add app work to it.
