# Tooling guide

Which mechanism to use for what, and what's installed in this repo. Project tooling is committed so that every session and machine gets the same workflow. Only personal preferences and secrets stay out.

## When to use which

| If you need... | Use | Location | Committed? |
|---|---|---|---|
| A fact or rule true in every session | Project instructions (keep short) | `AGENTS.md`, imported by `CLAUDE.md` | Yes |
| A rule for certain files only | Path-scoped rule | `.claude/rules/*.md` | Yes |
| A repeatable procedure, loaded on demand | Skill | `.claude/skills/<name>/SKILL.md` | Yes |
| Independent judgement, or heavy work kept out of the main context | Subagent | `.claude/agents/<name>.md` | Yes |
| Something that must happen every time, with no reliance on the model | Hook | `hooks` in `.claude/settings.json` | Yes |
| Access to an external system or live data | MCP server | `.mcp.json` at the root | Yes, with `${VAR}` for secrets |
| Control over what's allowed without a prompt | Permissions | `.claude/settings.json` | Yes |
| Deterministic logic used by both skills and CI | Script | `scripts/` | Yes |
| Enforcement outside your machine | CI | `.github/workflows/` | Yes |
| Your personal overrides for this project | Local settings | `.claude/settings.local.json` | **No** |
| Preferences across all your projects | User config | `~/.claude/` | **No** |
| The same tooling across several repos | Plugin | Its own repo | Later, if ever |

## Choosing between similar options

- **Instructions or skill?** If it applies to nearly every task, use instructions. If it's a procedure for a particular job, use a skill, so it only costs context when needed.
- **Skill or subagent?** A skill runs in the current conversation and shares its context. Use a subagent when a fresh view matters, or when the work would flood the conversation.
- **Skill or hook?** A skill is guidance the model follows. A hook is enforced by the harness. If breaking the rule would be costly, use a hook or CI as well.
- **MCP server or script?** Use MCP when an agent needs to work with an external system interactively. Use a script for fixed logic that also has to run in CI.
- **Hook or CI?** A hook gives fast feedback locally, and only for Claude Code sessions. CI applies to everyone, so it's the final check.

## Installed now

| Item | Type | Why it exists |
|---|---|---|
| `intake`, `slice-spec`, `slice-build`, `slice-review`, `slice-verdict`, `slice-close` | Skills | The workflow steps. They set `disable-model-invocation: true`, so only a human starts them. |
| `slice-auditor` | Subagent | Follows review instructions with no prior context, and runs cold-start checks. |
| `scripts/check_docs.py` | Script | Checks traceability and slice completeness, locally and in CI. |
| `scripts/protect_closed_slices.py` | `PreToolUse` hook | Blocks Claude's Edit and Write tools inside closed slices. It doesn't cover shell commands or non-Claude tools. |
| `.github/workflows/ci.yml` | CI | Runs the docs check, the unit tests, the build and the demo's tests on each PR. |
| `.github/workflows/deploy.yml` | CI | Tests, builds and deploys `main` and `slice/**` to GitHub Pages. The last push wins. |
| Supabase MCP server | MCP, in `.mcp.json` | Migrations, queries, logs and docs. Scoped to this project with `project_ref`, with manual approval kept on. Sign in with `/mcp`, so there's no token in the repo. Checked against https://supabase.com/docs/guides/getting-started/mcp. |
| Playwright MCP server | MCP, in `.mcp.json` | Interactive phone-sized checks and review screenshots. `@playwright/mcp` is pinned, and uses Chrome. Checked against https://github.com/microsoft/playwright-mcp. |
| `frontend-design` | Plugin, enabled in `.claude/settings.json` | Visual quality when building screens. |
| `supabase`, `supabase-postgres-best-practices` | Skills, from the official `supabase/agent-skills` repo | Supabase and Postgres practice for migrations and Row Level Security. Markdown only, and pinned by hash in `skills-lock.json`. |
| Vitest, Testing Library, Playwright | npm packages | Unit tests, and browser tests at 360px in Chromium and WebKit. The commands are in `AGENTS.md`. |

## Not installed yet

- `.claude/rules/` doesn't exist because nothing needs it yet. Add it when a slice first does.

Claude Code asks you to approve a project's MCP servers before they're used.

## Adding tooling

1. A slice lists what it needs under "Tooling needed" in `design.md`, so it's approved at Gate 2.
2. `/slice-close` asks what repeated or went wrong, and may propose a skill, rule or hook. Nothing is added unless you agree.
3. Each addition gets a row in "Installed now" saying why it exists.
