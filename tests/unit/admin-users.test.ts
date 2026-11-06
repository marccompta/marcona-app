import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { authErrorCode, emailDomain, isValidUsername, usernameToEmail } from '../../supabase/functions/admin-users/validate'
import { isValidUsername as loginRule, usernameToEmail as loginEmail } from '../../src/auth/username'
import { publicFunctions } from '../hosted/public-functions'

describe('admin-users rules', () => {
  it('REQ-036: accepts 3 to 20 lowercase characters of a-z, 0-9, _ and -', () => {
    for (const name of ['abc', 'anna_1', 'a-b', 'x'.repeat(20)]) expect(isValidUsername(name), name).toBe(true)
  })

  it('REQ-036: rejects anything else, without changing case', () => {
    for (const name of ['AB', 'ab', 'anna!', 'Anna', 'x'.repeat(21), '', ' anna', 3, null, undefined]) {
      expect(isValidUsername(name), String(name)).toBe(false)
    }
  })

  it('REQ-036: matches the rule the login uses', () => {
    for (const name of ['abc', 'AB', 'anna!', 'a-b_c']) expect(isValidUsername(name)).toBe(loginRule(name))
  })

  it('REQ-004: makes the same hidden email as the login', () => {
    expect(usernameToEmail('anna')).toBe(loginEmail('anna'))
    expect(emailDomain).toBe('marcona.invalid')
  })

  it('REQ-037, REQ-038: maps Auth errors to our own codes', () => {
    expect(authErrorCode('weak_password')).toBe('weak_password')
    expect(authErrorCode('email_exists')).toBe('username_taken')
    expect(authErrorCode('anything_else')).toBe('failed')
    expect(authErrorCode(undefined)).toBe('failed')
  })
})

describe('public functions', () => {
  it('REQ-053: the removed-user test covers every public function in the migrations', () => {
    const sql = readdirSync('supabase/migrations')
      .map((file) => readFileSync(`supabase/migrations/${file}`, 'utf8'))
      .join('\n')
    const inMigrations = [...sql.matchAll(/create (?:or replace )?function public\.(\w+)/g)].map((match) => match[1])
    const covered = Object.keys(publicFunctions('id'))

    expect(inMigrations.length).toBeGreaterThan(0)
    for (const name of inMigrations) expect(covered, name).toContain(name)
  })
})
