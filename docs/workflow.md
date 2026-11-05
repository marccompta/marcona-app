# Workflow guide

This is the human guide to building in vertical slices. A **slice** is the smallest change that delivers something a person can see and judge, working end to end through every layer it touches.

## The loop

```
requirements → /intake → GATE 1 → /slice-spec → GATE 2 → /slice-build → /slice-review → GATE 3
                                       ▲                       ▲                           │
                                       │                       └───── changes ─────────────┤
                                       └──────────── reject, then re-spec ─────────────────┤
                                                                                           │
                                                    /slice-close ◄────── approve ──────────┘
```

| Gate | You decide | You look at |
|---|---|---|
| 1 | Are these the right slices, in the right order? | `docs/product/backlog.md` |
| 2 | Is this what should be built, and is the approach sound? | `spec.md`, `design.md`, `tasks.md` |
| 3 | Does the result work and meet your expectations? | `review.md` |

## Typical session

This is the standard mode. For tight deadlines, see [Fast lane](#fast-lane).

1. Run `/intake` and paste your requirements. Answer any questions, then approve or adjust the proposed slices.
2. Run `/slice-spec 001`. Read the spec, then approve it or ask for changes.
3. Run `/slice-build 001`, then `/slice-review 001`.
4. Follow `review.md`, then give a verdict:
   - `/slice-verdict 001 approve`
   - `/slice-verdict 001 changes The empty state text is confusing; the date format should be DD/MM`
   - `/slice-verdict 001 reject This approach is too slow to use`
5. After approval, run `/slice-close 001` and merge the PR.
6. Repeat with the next slice. Run `/intake` again whenever you have new requirements.

## Fast lane

Use this when your time is the bottleneck, such as a close deadline. To turn it on, ask for fast lane in your `/intake` input, or set `Mode: fast` under "Workflow settings" in `AGENTS.md`.

| | Standard | Fast lane |
|---|---|---|
| Approving slices and specs | Gate 1, then Gate 2 for each slice | One combined approval at the end of `/intake` |
| After a slice is built | You run `/slice-review` | The review is prepared automatically |
| After you approve | You run `/slice-close` | The slice closes automatically |
| Commands you run per slice | 5 | 2: `/slice-build` and `/slice-verdict` |

**What fast lane never skips:** your review at Gate 3, tests, the independent audit of `review.md`, `record.md`, the living docs and `check_docs.py`. A verdict still only ever comes from you.

**The trade-off:** later specs are written before earlier slices exist, so they can go stale. `/slice-build` therefore compares each spec with what has since been built. If that changes what you approved, it updates the spec, tells you what changed, and waits for your OK.

### Auto-push

Pushing is a separate setting, because it's outward-facing. With `Auto-push: no`, the default, skills ask before pushing. With `Auto-push: yes`, skills push a slice's branch when its review needs a deployed site, and merge approved slices into `main` and push them. Only turn it on if you're happy for an approval to publish the slice.

## Slice status

The status is in the frontmatter of `spec.md`:

| Status | Meaning |
|---|---|
| `draft` | Spec being written, or waiting for Gate 2 |
| `approved` | Gate 2 passed; ready to build |
| `building` | Work in progress |
| `in-review` | Waiting for your verdict at Gate 3 |
| `changes-requested` | You asked for fixes; goes back to `in-review` afterwards |
| `accepted` | You approved it; history not written yet |
| `closed` | Finished and frozen |
| `rejected` | Not merged; kept as history |

## Your verdict

| Verdict | What happens |
|---|---|
| **Approve** | Status becomes `accepted`. Run `/slice-close`, which happens automatically in fast lane. |
| **Changes** | Your notes are logged as numbered items and become tasks. After the fixes, you get a review covering only what changed, plus a regression check. |
| **Reject** | The branch isn't merged, and the reason is logged. You then choose to re-spec the slice at Gate 2, or drop it and return its requirements to the backlog. |

If a note goes beyond the slice's acceptance criteria, you're asked whether to send it to `/intake` or to widen the slice by amending the spec. New scope isn't added quietly as a "fix".

## How reviews are written

`review.md` always has the same seven sections, and the instructions fit what the slice produced:

| Slice output | Instructions you get |
|---|---|
| CLI or script | Exact commands to copy, with expected output |
| Website or UI | Start command, URL, a click path, what to look for |
| Deployed change | Link to the environment, plus how to tell the new version is live |
| API | Ready-to-run requests with expected responses |
| Visual or design | Images in `evidence/`, with what to compare them against |
| Files, reports, data | Where the output is, and what to spot-check |
| Physical or manual process | Numbered steps with a result to confirm at each one |
| Internal change, nothing visible | Before/after evidence, and why there's nothing to try by hand |

A slice can mix methods. Every instruction is run as written before it reaches you, and an independent agent (`slice-auditor`) follows it with no prior context to catch unclear steps.

## Definition of Ready (before Gate 2)

- The slice delivers something a person can observe.
- Requirements are in EARS form, with no open ambiguities.
- Every requirement has at least one acceptance criterion.
- Non-goals are listed.
- The design names any new tooling it needs.
- The slice meets INVEST: independent, negotiable, valuable, estimable, small, testable.

## Definition of Done (before closing)

- All tasks are checked.
- Tests pass, and each testable requirement is cited by a test.
- The latest verdict in `review.md` is `approve`, and it came from the human.
- `record.md` is complete, including deviations from the design.
- `docs/system/` describes the new behaviour.
- ADRs exist for significant decisions.
- `HISTORY.md` and `CHANGELOG.md` are updated.
- `python scripts/check_docs.py` passes.

## Standards

| Purpose | Standard |
|---|---|
| Requirements | [EARS](https://alistairmavin.com/ears/) |
| Acceptance criteria | [Gherkin](https://cucumber.io/docs/gherkin/reference/) |
| Decisions | [MADR](https://adr.github.io/madr/) |
| Commits | [Conventional Commits](https://www.conventionalcommits.org/) |
| Changelog | [Keep a Changelog](https://keepachangelog.com/) |
| Versions | [SemVer](https://semver.org/) |
| Agent instructions | [AGENTS.md](https://agents.md/) |
