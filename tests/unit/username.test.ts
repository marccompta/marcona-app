import { describe, expect, it } from 'vitest'
import { isValidUsername, normaliseUsername, usernameToEmail } from '../../src/auth/username'

describe('usernames', () => {
  it('REQ-004: maps a username to its hidden email', () => {
    expect(usernameToEmail('anna')).toBe('anna@marcona.invalid')
  })

  it('REQ-004: ignores case and stray spaces, as phone keyboards add them', () => {
    expect(normaliseUsername('  Anna ')).toBe('anna')
  })

  it('REQ-004: accepts 3 to 20 lowercase letters, digits, _ and -', () => {
    for (const name of ['abc', 'a_b-1', 'a'.repeat(20)]) expect(isValidUsername(name), name).toBe(true)
  })

  it('REQ-004: rejects anything else, including emails', () => {
    for (const name of ['ab', 'a'.repeat(21), 'anna@example.com', 'la nna', 'Anna', 'ànna', '']) {
      expect(isValidUsername(name), name).toBe(false)
    }
  })
})
