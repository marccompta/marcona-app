import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const python = process.platform === 'win32' ? 'python' : 'python3'

const folders: string[] = []

afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true })
})

// The smallest project the checker accepts, with one slice in the given state.
function project(status: string, tasks: string | null) {
  const root = mkdtempSync(join(tmpdir(), 'check-docs-'))
  folders.push(root)
  const slice = join(root, 'slices', '001-prova')
  mkdirSync(slice, { recursive: true })
  mkdirSync(join(root, 'docs', 'product'), { recursive: true })

  writeFileSync(join(root, 'docs', 'product', 'backlog.md'), '| REQ-001 | Prova. | planned | 001 | manual |\n')
  writeFileSync(join(root, 'HISTORY.md'), '[001](slices/001-prova/record.md)\n')
  writeFileSync(join(slice, 'spec.md'), `---\nslice: "001"\nstatus: ${status}\nrequirements: [REQ-001]\n---\n`)
  writeFileSync(join(slice, 'review.md'), '- Verdict: approve\n')
  writeFileSync(join(slice, 'record.md'), '# Record\n')
  if (tasks !== null) writeFileSync(join(slice, 'tasks.md'), tasks)
  return root
}

const check = (root: string) => {
  const { status, stdout } = spawnSync(python, ['scripts/check_docs.py', root], { encoding: 'utf8' })
  return { failed: status !== 0, output: stdout }
}

const ticked = '- [x] **T1:** Una tasca.\n'
const unticked = '- [x] **T1:** Una tasca.\n- [ ] **T2:** Una altra.\n'

describe('check_docs.py and tasks', () => {
  for (const status of ['in-review', 'accepted', 'closed']) {
    it(`fails a slice that is ${status} with an unchecked task`, () => {
      const { failed, output } = check(project(status, unticked))
      expect(failed).toBe(true)
      expect(output).toContain(`001-prova: ${status} with unchecked tasks`)
    })

    it(`fails a slice that is ${status} with no tasks.md`, () => {
      const { failed, output } = check(project(status, null))
      expect(failed).toBe(true)
      expect(output).toContain('001-prova: tasks.md is missing')
    })

    it(`passes a slice that is ${status} with every task checked`, () => {
      expect(check(project(status, ticked)).failed).toBe(false)
    })
  }

  for (const status of ['draft', 'approved', 'building', 'changes-requested', 'rejected']) {
    it(`lets a slice that is ${status} have unchecked tasks`, () => {
      expect(check(project(status, unticked)).failed).toBe(false)
    })
  }
})
