import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Some prefixes are split so this file doesn't match itself.
const patterns: Record<string, RegExp> = {
  'Supabase secret key': new RegExp('sb_' + 'secret_[A-Za-z0-9_-]{8,}'),
  'Supabase access token': new RegExp('sb' + 'p_[a-f0-9]{40}'),
  'JSON web token, such as a legacy service key': new RegExp('ey' + 'J[A-Za-z0-9_-]{10,}[.]ey' + 'J[A-Za-z0-9_-]{10,}[.]'),
  'database URL with a password': new RegExp('postgres(ql)?://[^:/ ]+:[^@ ]+@'),
  'private key': new RegExp('-----BEGIN [A-Z ]*PRIVATE' + ' KEY-----'),
  'GitHub token': new RegExp('(gh' + 'p_[A-Za-z0-9]{30,}|github_' + 'pat_[A-Za-z0-9_]{30,})'),
  'assigned secret': new RegExp('(SERVICE_ROLE|SECRET_KEY|DB_PASSWORD|ADMIN_' + 'PASSWORD)[A-Z_]* *= *[^ <$"\'`\\r\\n]'),
}

const scan = (content: string) =>
  Object.entries(patterns)
    .filter(([, pattern]) => pattern.test(content))
    .map(([name]) => name)

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })

const binary = /\.(png|woff2|ico|jpg)$/

// Tracked files plus new ones that git wouldn't ignore.
const files = git('ls-files', '--cached', '--others', '--exclude-standard')
  .split('\n')
  .filter((file) => file && !binary.test(file) && existsSync(file))

describe('secret scan', () => {
  it('REQ-031: recognises each kind of secret', () => {
    const samples = [
      'sb_' + 'secret_abcdefgh1234',
      'sb' + 'p_' + 'a'.repeat(40),
      'ey' + 'Jabcdefghijkl.ey' + 'Jabcdefghijkl.signature',
      'postgres://postgres:' + 'hunter2@db.example.co:5432/postgres',
      '-----BEGIN RSA PRIVATE' + ' KEY-----',
      'gh' + 'p_' + 'a'.repeat(36),
      'MARCONA_ADMIN_' + 'PASSWORD=hunter2',
    ]
    for (const sample of samples) expect(scan(sample), sample).not.toEqual([])
  })

  it('REQ-031: lets placeholders through', () => {
    expect(scan('MARCONA_ADMIN_' + 'PASSWORD=<your password>')).toEqual([])
    expect(scan('sb_publishable_abcdefgh1234')).toEqual([])
  })

  it('REQ-031: finds no secret in the working tree', () => {
    const found = files.flatMap((file) => scan(readFileSync(file, 'utf8')).map((name) => `${file}: ${name}`))
    expect(found).toEqual([])
  })

  it('REQ-031: finds no secret in any commit', () => {
    expect(scan(git('log', '--all', '-p', '--no-color'))).toEqual([])
  })

  it('REQ-031: keeps the local password out of every file', () => {
    const local = '.env.test.local'
    if (!existsSync(local)) return
    const password = readFileSync(local, 'utf8').match(/^MARCONA_ADMIN_PASSWORD=(.+)$/m)?.[1].trim()
    if (!password) return

    expect(git('check-ignore', local).trim()).toBe(local)
    expect(files.filter((file) => readFileSync(file, 'utf8').includes(password))).toEqual([])
  })

  it('REQ-031: ignores the local secrets file', () => {
    expect(git('check-ignore', '.env.test.local').trim()).toBe('.env.test.local')
  })
})
