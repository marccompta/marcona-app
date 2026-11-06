import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const python = process.platform === 'win32' ? 'python' : 'python3'

// Swaps in a fake test command, so this never runs the real suite from inside itself.
const runHook = (command: string, testCommand: string) =>
  spawnSync(python, ['scripts/require_passing_tests.py'], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
    env: { ...process.env, MARCONA_HOOK_TEST_COMMAND: testCommand },
  })

const pass = 'node -e "process.exit(0)"'
const fail = 'node -e "console.log(1234567);process.exit(1)"'

describe('commit hook', () => {
  it('blocks a commit when the tests fail, and says why', () => {
    const result = runHook('git commit -m "feat: x"', fail)
    expect(result.status).toBe(2)
    expect(result.stderr).toContain('unit tests failed')
    expect(result.stderr).toContain('1234567')
  })

  it('allows a commit when the tests pass', () => {
    expect(runHook('git commit -m "feat: x"', pass).status).toBe(0)
  })

  it('spots a commit at the end of a chain or behind git options', () => {
    for (const command of ['git add -A && git commit -F -', 'cd repo; git -c a=b commit -m x', 'git -C repo commit --amend']) {
      expect(runHook(command, fail).status, command).toBe(2)
    }
  })

  it('leaves other commands alone, even when the tests fail', () => {
    for (const command of ['git status', 'git log --grep commit', 'npm test', 'git push origin main']) {
      expect(runHook(command, fail).status, command).toBe(0)
    }
  })

  it('runs for both of Claude\'s shells', () => {
    const settings = JSON.parse(readFileSync('.claude/settings.json', 'utf8'))
    const entry = settings.hooks.PreToolUse.find((hook: { hooks: { command: string }[] }) =>
      hook.hooks.some(({ command }) => command.includes('require_passing_tests.py')),
    )
    expect(entry.matcher).toBe('Bash|PowerShell')
  })
})
