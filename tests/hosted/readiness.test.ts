import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fetchPeople } from '../../src/lib/data'
import { fetchExport, wipeTestData } from '../../src/lib/readiness'
import { adminClient, adminLogin, createTestUser, signOutAll, type TestUser } from './env'

// The export, the wipe and its lock on the real project. Only refusals and reads
// happen here: a real wipe or lock is the human's call, and the rules that need
// one are in tests/sql/readiness.sql, which always rolls back.
afterAll(signOutAll)

let admin: Awaited<ReturnType<typeof adminClient>>
let player: TestUser

beforeAll(async () => {
  admin = await adminClient()
  player = await createTestUser('r-player')
})

describe('export', () => {
  it('REQ-164: the admin gets every user, test accounts included, every event and every movement', async () => {
    const dump = await fetchExport(admin)
    expect(Object.keys(dump).sort()).toEqual(['events', 'exported_at', 'ledger', 'users'])
    const usernames = dump.users.map((user) => user.username)
    expect(usernames).toContain(adminLogin().username)
    expect(usernames).toContain(player.username)
    expect(dump.events.every((event) => Array.isArray(event.participants))).toBe(true)
    expect(dump.ledger.length).toBeGreaterThan(0)
  })

  it('REQ-167: a player cannot export', async () => {
    const { data, error } = await player.client.rpc('admin_export')
    expect(data).toBeNull()
    expect(error?.code).toBe('42501')
  })
})

describe('wipe', () => {
  it('REQ-167: a player cannot wipe, even with the word', async () => {
    await expect(wipeTestData('ESBORRA', player.client)).rejects.toMatchObject({ code: '42501' })
    expect((await fetchPeople(player.client)).map((person) => person.username)).toContain(player.username)
  })

  // Other hosted files run alongside and move real balances, so this checks that
  // everyone is still there, and that the admin's own export still has history.
  it('REQ-166: the admin without the exact word changes nothing', async () => {
    const ids = async () => (await fetchPeople(admin)).map((person) => person.user_id)
    const before = await ids()
    for (const word of ['esborra', 'ESBORRA ', '']) {
      await expect(wipeTestData(word, admin)).rejects.toMatchObject({ message: 'wipe_not_confirmed' })
    }
    expect(await ids()).toEqual(expect.arrayContaining(before))
    expect((await fetchPeople(player.client)).map((person) => person.username)).toContain(player.username)
    expect((await fetchExport(admin)).ledger.length).toBeGreaterThan(0)
  })
})
