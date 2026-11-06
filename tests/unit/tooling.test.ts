import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const mcp = JSON.parse(readFileSync('.mcp.json', 'utf8')).mcpServers
const settings = JSON.parse(readFileSync('.claude/settings.json', 'utf8'))

describe('tooling', () => {
  it('REQ-034: scopes the Supabase MCP server to this one project', () => {
    expect(mcp.supabase.url).toMatch(/[?&]project_ref=ndkgmenntqhjojalqbdm(&|$)/)
  })

  it('REQ-031, REQ-034: signs in through the browser, with no token in the repo', () => {
    expect(mcp.supabase.headers).toBeUndefined()
    expect(mcp.supabase.env).toBeUndefined()
  })

  it('REQ-034: never allows Supabase tools without asking', () => {
    const allowed: string[] = settings.permissions?.allow ?? []
    expect(allowed.filter((rule) => rule.includes('supabase'))).toEqual([])
  })

  it('REQ-029: names every MCP server in docs/tooling.md', () => {
    const tooling = readFileSync('docs/tooling.md', 'utf8').toLowerCase()
    for (const server of Object.keys(mcp)) expect(tooling, server).toContain(`${server} mcp server`)
  })

  it('REQ-030: covers every manual step in docs/setup.md', () => {
    const setup = readFileSync('docs/setup.md', 'utf8')
    for (const heading of ['public', 'Supabase project', 'Auth', 'GitHub Pages', 'plugin', 'MCP servers', 'admin account']) {
      expect(setup, heading).toMatch(new RegExp(`^## \\d\\. .*${heading}`, 'm'))
    }
  })

  it('REQ-032: keeps timestamped migrations in supabase/migrations', () => {
    expect(existsSync('supabase/migrations')).toBe(true)
    const files = readdirSync('supabase/migrations')
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) expect(file).toMatch(/^\d{14}_[a-z_]+\.sql$/)
  })
})
