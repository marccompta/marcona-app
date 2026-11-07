import { afterAll, describe, expect, it } from 'vitest'
import { adminClient, adminLogin, signOutAll } from './env'

afterAll(signOutAll)

describe('active users', () => {
  it('REQ-053, REQ-056: the admin is active, with the new columns', async () => {
    const client = await adminClient()
    const { data, error } = await client
      .from('profiles')
      .select('username, role, balance, removed_at, is_test')
      .eq('username', adminLogin().username)
    expect(error).toBeNull()
    expect(data).toEqual([
      { username: adminLogin().username, role: 'admin', balance: expect.any(Number), removed_at: null, is_test: false },
    ])
  })
})
