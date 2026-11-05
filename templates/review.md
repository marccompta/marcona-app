# Slice NNN review

## 1. What to look at

What changed, in plain language, from a user's point of view.

## 2. Before you start

- **You need:** prerequisites.
- **Setup:** exact steps, or "None".
- **Reset afterwards:** how to clean up, or "Nothing to clean up".

## 3. How to review

Use whichever methods fit, and delete the rest.

**CLI or script:** the exact command, then its expected output.
**Website or UI:** start command, URL, click path, what to look for.
**Deployed change:** link, and how to tell the new version is live.
**API:** a ready-to-run request and the expected response.
**Visual or design:** images from `evidence/`, and what to compare them against.
**Files, reports, data:** where the output is, and what to spot-check.
**Manual process:** numbered steps, each with a result to confirm.
**Nothing visible:** before/after evidence, and why there's nothing to try by hand.

Never include secrets. Name the environment variable or vault entry instead.

If there's a reset in section 2, end with a step that points back to it.

## 4. Checklist

| # | Requirement | Check | Expected result |
|---|---|---|---|
| 1 | REQ-NNN | What to do | What you should see |

## 5. Already checked automatically

| Check | Command | Result |
|---|---|---|
| Tests | `command` | N passed |
| Docs | `python scripts/check_docs.py` | Passed |

Instructions run as written: yes/no, by whom. Audit by `slice-auditor`: result.

## 6. Known limitations

- What's missing or deliberately left for later.

## 7. Your verdict

Type one of these in a Claude Code session started at the repo root:

- `/slice-verdict NNN approve`
- `/slice-verdict NNN changes <what to fix>`
- `/slice-verdict NNN reject <why>`

## Review log

### Round 1

- Verdict: pending
- Date:
- Notes:
