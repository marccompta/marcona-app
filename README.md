# marcona-app

This repo is set up to build an app in vertical slices, using spec-driven development with a human review after every slice. The app itself hasn't been defined yet.

## Start here

1. Read [the workflow guide](docs/workflow.md).
2. Look at the worked example in [examples/task-tracker](examples/task-tracker/AGENTS.md).
3. Run `claude` in this folder, accept the trust prompt, then run `/intake` and paste your requirements.

## Where things are

| Path | Contents |
|---|---|
| [AGENTS.md](AGENTS.md) | Instructions for coding agents |
| [HISTORY.md](HISTORY.md) | Timeline of slices |
| [docs/workflow.md](docs/workflow.md) | How the process works |
| [docs/tooling.md](docs/tooling.md) | When to use skills, subagents, hooks, MCP servers and so on |
| [docs/system/](docs/system/capabilities.md) | What the system does now |
| [docs/adr/](docs/adr/README.md) | Why decisions were made |
| [docs/product/](docs/product/backlog.md) | Vision, backlog and raw requirements |
| [slices/](slices/README.md) | Spec, design, tasks, review and record for each slice |
| [templates/](templates/spec.md) | Starting point for each document |

To remove the demo, delete `examples/` and the two demo steps in `.github/workflows/ci.yml`.
