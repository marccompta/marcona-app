import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adminClient, createTestUser, publicClient, signOutAll, type TestUser } from './env'

// The rules and payouts are in tests/sql/games.sql, because a game needs the real
// admin, who can't invite test accounts. This file covers what needs the real API.
afterAll(signOutAll)

let admin: Awaited<ReturnType<typeof adminClient>>
let outsider: TestUser

beforeAll(async () => {
  admin = await adminClient()
  outsider = await createTestUser('g-outsider')
})

describe('the games table', () => {
  it('REQ-146: an active user can read it, and nobody can write to it', async () => {
    const { data, error } = await outsider.client.from('games').select('id, enabled, description, settings')
    expect(error).toBeNull()
    expect(data?.map((game) => game.id)).toContain('confia_o_traeix')

    for (const client of [outsider.client, admin]) {
      const update = await client.from('games').update({ enabled: false }).eq('id', 'confia_o_traeix').select()
      expect(update.error?.code).toBe('42501')
      const insert = await client.from('games').insert({ id: 'x', description: 'x', settings: {} })
      expect(insert.error?.code).toBe('42501')
    }
  })

  it('REQ-146: nothing is readable without a login', async () => {
    const { data, error } = await publicClient().from('games').select('id')
    expect(data ?? []).toEqual([])
    if (error) expect(error.code).toBe('42501')
  })
})

describe('creating a game', () => {
  it('REQ-176: a player calling the function directly is refused', async () => {
    const { error } = await outsider.client.rpc('create_game_event', {
      p_request_id: randomUUID(),
      p_game: 'confia_o_traeix',
      p_name: 'Prova',
      p_buy_in: 1,
      p_plays: true,
      p_invitees: [randomUUID()],
      p_force: false,
    })
    expect(error?.code).toBe('42501')
  })
})
