import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const deploy = () => readFileSync('.github/workflows/deploy.yml', 'utf8')
const ci = () => readFileSync('.github/workflows/ci.yml', 'utf8')

describe('workflows', () => {
  it('REQ-001: deploys the built site to GitHub Pages', () => {
    expect(deploy()).toContain('actions/deploy-pages')
    expect(deploy()).toMatch(/path: dist/)
  })

  it('REQ-033: deploys main and every slice branch', () => {
    expect(deploy()).toMatch(/branches:\s*\[main, 'slice\/\*\*'\]/)
  })

  it('REQ-033: never runs two deploys at once', () => {
    expect(deploy()).toMatch(/concurrency:\s*\n\s*group: pages/)
  })

  it('REQ-001: CI runs the unit tests and the build', () => {
    expect(ci()).toContain('npm test')
    expect(ci()).toContain('npm run build')
  })
})
