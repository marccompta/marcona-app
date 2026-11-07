import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { callAdminUsers } from '../../src/lib/adminUsers'
import { adminClient, createTestAccount, createTestUser, logInAs, publicClient, signOutAll, testPassword, type TestUser } from './env'
import { publicFunctions } from './public-functions'

afterAll(signOutAll)

let admin: Awaited<ReturnType<typeof adminClient>>
let viewer: TestUser

beforeAll(async () => {
  admin = await adminClient()
  viewer = await createTestUser('testimoni')
})

// What a phone holding this session would see once the session has ended.
async function expectSessionEnded(user: TestUser) {
  const { data } = await user.client.auth.getSession()
  const { refresh_token: refreshToken, access_token: accessToken } = data.session!

  const check = await publicClient().auth.getUser(accessToken)
  expect(check.data.user).toBeNull()
  const refresh = await publicClient().auth.refreshSession({ refresh_token: refreshToken })
  expect(refresh.data.session).toBeNull()
  expect(refresh.error).not.toBeNull()
}

const newPassword = 'una-altra-contrasenya-2'

describe('resetting a password', () => {
  it('REQ-044: the new password works and the old one does not', async () => {
    const user = await createTestAccount('reset')
    await callAdminUsers(admin, { action: 'reset', userId: user.userId, password: newPassword })

    await expect(logInAs(user.username, testPassword)).rejects.toMatchObject({ code: 'invalid_credentials' })
    await expect(logInAs(user.username, newPassword)).resolves.toBeDefined()
  })

  it('REQ-045: ends the sessions the user already has', async () => {
    const user = await createTestUser('reset-sessio')
    await callAdminUsers(admin, { action: 'reset', userId: user.userId, password: newPassword })
    await expectSessionEnded(user)
  })

  it('REQ-038: rejects a password below the minimum', async () => {
    const user = await createTestAccount('reset-curta')
    await expect(callAdminUsers(admin, { action: 'reset', userId: user.userId, password: '12345' })).rejects.toEqual({
      code: 'weak_password',
    })
  })

  it('REQ-046, REQ-055: a player cannot reset a password, not even their own', async () => {
    await expect(
      callAdminUsers(viewer.client, { action: 'reset', userId: viewer.userId, password: newPassword }),
    ).rejects.toEqual({ code: 'not_allowed' })
  })

  it('REQ-044: an unknown user gets a clear refusal', async () => {
    await expect(callAdminUsers(admin, { action: 'reset', userId: randomUUID(), password: newPassword })).rejects.toEqual({
      code: 'user_not_found',
    })
  })
})

describe('removing a user', () => {
  let removed: TestUser
  let accessToken: string

  beforeAll(async () => {
    removed = await createTestUser('baixa')
    const adjustment = await admin.rpc('admin_adjust', {
      p_request_id: randomUUID(),
      p_user_id: removed.userId,
      p_action: 'add',
      p_amount: 7,
      p_concept: 'Abans de marxar',
    })
    expect(adjustment.error).toBeNull()
    accessToken = (await removed.client.auth.getSession()).data.session!.access_token
    await expectStillWorks()
    await callAdminUsers(admin, { action: 'remove', userId: removed.userId })
  })

  async function expectStillWorks() {
    const { data } = await removed.client.from('profiles').select('username').eq('user_id', removed.userId)
    expect(data).toHaveLength(1)
  }

  it('REQ-048: blocks their login', async () => {
    await expect(logInAs(removed.username, removed.password)).rejects.toMatchObject({ code: 'user_banned' })
  })

  it('REQ-049: revokes their sessions', async () => {
    await expectSessionEnded(removed)
  })

  it('REQ-050: leaves the ranking, which lists active users only', async () => {
    const { data, error } = await viewer.client.from('profiles').select('user_id').is('removed_at', null)
    expect(error).toBeNull()
    expect(data!.map((row) => row.user_id)).not.toContain(removed.userId)
  })

  it('REQ-051: keeps their history in the audit', async () => {
    const { data, error } = await viewer.client.from('ledger').select('delta, concept').eq('user_id', removed.userId)
    expect(error).toBeNull()
    expect(data).toEqual([{ delta: 7, concept: 'Abans de marxar' }])
  })

  it('REQ-037: their username is never reused', async () => {
    await expect(
      callAdminUsers(admin, { action: 'create', username: removed.username, password: testPassword, isTest: true }),
    ).rejects.toEqual({ code: 'username_taken' })
  })

  it('REQ-048: removing them again is safe', async () => {
    await expect(callAdminUsers(admin, { action: 'remove', userId: removed.userId })).resolves.toBeDefined()
  })

  it('REQ-053: their unexpired token reads nothing from any table', async () => {
    expect(JSON.parse(atob(accessToken.split('.')[1])).exp * 1000).toBeGreaterThan(Date.now())
    for (const table of ['profiles', 'ledger']) {
      const { data } = await removed.client.from(table).select('*')
      expect(data ?? [], table).toEqual([])
    }
  })

  it('REQ-053: their unexpired token is rejected by every public function', async () => {
    for (const [name, args] of Object.entries(publicFunctions(removed.userId))) {
      const { error } = await removed.client.rpc(name, args)
      expect(error, name).not.toBeNull()
    }
  })

  it('REQ-053: their unexpired token is rejected by the Edge Function', async () => {
    await expect(callAdminUsers(removed.client, { action: 'remove', userId: viewer.userId })).rejects.toEqual({
      code: 'not_allowed',
    })
  })

  it('REQ-044: a removed user cannot be given a new password', async () => {
    await expect(callAdminUsers(admin, { action: 'reset', userId: removed.userId, password: newPassword })).rejects.toEqual({
      code: 'user_not_found',
    })
  })

  it('REQ-055: a player cannot remove anyone', async () => {
    const target = await createTestAccount('diana')
    await expect(callAdminUsers(viewer.client, { action: 'remove', userId: target.userId })).rejects.toEqual({
      code: 'not_allowed',
    })
  })
})

describe('the admin and removal', () => {
  it('REQ-052: the admin cannot remove themselves', async () => {
    const { data } = await admin.auth.getSession()
    await expect(callAdminUsers(admin, { action: 'remove', userId: data.session!.user.id })).rejects.toEqual({
      code: 'cannot_remove_self',
    })
  })
})

describe('test accounts', () => {
  it('REQ-050: real users never see them, and they never see real users', async () => {
    const { data: seenByAdmin, error } = await admin.from('profiles').select('username, is_test')
    expect(error).toBeNull()
    expect(seenByAdmin!.filter((row) => row.is_test)).toEqual([])

    const { data: seenByTest } = await viewer.client.from('profiles').select('role, is_test')
    expect(seenByTest!.filter((row) => !row.is_test)).toEqual([])
  })

  it('REQ-051: nor do real users see their movements', async () => {
    const { data, error } = await admin.from('ledger').select('concept').eq('concept', 'Abans de marxar')
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})
