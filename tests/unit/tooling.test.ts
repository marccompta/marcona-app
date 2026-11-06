import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const mcp = JSON.parse(readFileSync('.mcp.json', 'utf8')).mcpServers
const settings = JSON.parse(readFileSync('.claude/settings.json', 'utf8'))

describe('tooling', () => {
  it('REQ-206: scopes the Supabase MCP server to this one project', () => {
    expect(mcp.supabase.url).toMatch(/[?&]project_ref=ndkgmenntqhjojalqbdm(&|$)/)
  })

  it('REQ-031, REQ-206: signs in through the browser, with no token in the repo', () => {
    expect(mcp.supabase.headers).toBeUndefined()
    expect(mcp.supabase.env).toBeUndefined()
  })

  it('REQ-206: adds no blanket allow rule for Supabase tools', () => {
    const allowed: string[] = settings.permissions?.allow ?? []
    expect(allowed.filter((rule) => rule.includes('supabase'))).toEqual([])
  })

  it('REQ-206: keeps asking before Supabase tools other than migrations that can change something', () => {
    const asked: string[] = settings.permissions?.ask ?? []
    const tools = [
      'execute_sql',
      'deploy_edge_function',
      'create_edge_function_secret',
      'create_branch',
      'delete_branch',
      'merge_branch',
      'rebase_branch',
      'reset_branch',
    ]
    for (const tool of tools) expect(asked, tool).toContain(`mcp__supabase__${tool}`)
  })

  it('REQ-206: lets migrations run without a prompt', () => {
    expect(settings.permissions?.ask ?? []).not.toContain('mcp__supabase__apply_migration')
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
