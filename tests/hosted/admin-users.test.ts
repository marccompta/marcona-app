import { afterAll, describe, expect, it } from 'vitest'
import { callAdminUsers } from '../../src/lib/adminUsers'
import { adminClient, createTestUser, logInAs, publicClient, signOutAll, testPassword, testUsername } from './env'

afterAll(signOutAll)

const create = async (username: string, password = testPassword) =>
  callAdminUsers(await adminClient(), { action: 'create', username, password, isTest: true })

describe('creating users', () => {
  it('REQ-035, REQ-054: creates a user who can log in, with 0 marcones', async () => {
    const user = await createTestUser('nova')
    const { data, error } = await user.client.from('profiles').select('username, role, balance').eq('user_id', user.userId)
    expect(error).toBeNull()
    expect(data).toEqual([{ username: user.username, role: 'player', balance: 0 }])
  })

  it('REQ-036: rejects a badly formed username', async () => {
    await expect(create('AB')).rejects.toEqual({ code: 'invalid_username' })
    await expect(create('anna!')).rejects.toEqual({ code: 'invalid_username' })
  })

  it('REQ-037: rejects a username that already exists', async () => {
    const user = await createTestUser('doble')
    await expect(create(user.username)).rejects.toEqual({ code: 'username_taken' })
  })

  it('REQ-038: rejects a password below the minimum, and creates nobody', async () => {
    const username = testUsername('curta')
    await expect(create(username, '12345')).rejects.toEqual({ code: 'weak_password' })
    await expect(logInAs(username, '12345')).rejects.toMatchObject({ code: 'invalid_credentials' })
  })
})

describe('who can call admin-users', () => {
  it('REQ-055: a player is rejected', async () => {
    const player = await createTestUser('jugadora')
    await expect(
      callAdminUsers(player.client, { action: 'create', username: testUsername('intrusa'), password: testPassword }),
    ).rejects.toEqual({ code: 'not_allowed' })
  })

  it('REQ-055: someone with no session is rejected', async () => {
    await expect(
      callAdminUsers(publicClient(), { action: 'create', username: testUsername('anonima'), password: testPassword }),
    ).rejects.toEqual({ code: 'not_allowed' })
  })
})
