import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adjustBalance, fetchMovements, fetchPeople, rankPeople } from '../../src/lib/data'
import { adminClient, createTestAccount, createTestUser, signOutAll, testUsername, type TestAccount, type TestUser } from './env'

afterAll(signOutAll)

let viewer: TestUser
let zoe: TestAccount
let anna: TestAccount
let bea: TestAccount

const add = async (user: TestAccount, amount: number, concept: string) =>
  adjustBalance(
    { requestId: randomUUID(), userId: user.userId, action: 'add', amount, concept },
    await adminClient(),
  )

beforeAll(async () => {
  viewer = await createTestUser('lectora')
  zoe = await createTestAccount('zoe')
  anna = await createTestAccount('anna')
  bea = await createTestAccount('bea')
  await add(zoe, 50, 'Primera')
  await add(bea, 20, 'Segona')
  await add(anna, 20, 'Tercera')
})

describe('what the screens read', () => {
  it('REQ-063, REQ-064: the ranking query gives the right order', async () => {
    const ranked = rankPeople(await fetchPeople(viewer.client))
    const mine = ranked.map((person) => person.username).filter((name) => [zoe, anna, bea].some((user) => user.username === name))
    expect(mine).toEqual([testUsername('zoe'), testUsername('anna'), testUsername('bea')])
  })

  it('REQ-066: a person shows only the movements on them', async () => {
    const movements = await fetchMovements(anna.userId, viewer.client)
    expect(movements).toHaveLength(1)
    expect(movements[0]).toMatchObject({ delta: 20, balance_after: 20, concept: 'Tercera', who: { username: anna.username } })
  })

  it('REQ-067, REQ-069: the audit is newest first, with every field it shows', async () => {
    const movements = await fetchMovements(undefined, viewer.client)
    const concepts = movements.map((movement) => movement.concept)

    expect(concepts.indexOf('Tercera')).toBeLessThan(concepts.indexOf('Segona'))
    expect(concepts.indexOf('Segona')).toBeLessThan(concepts.indexOf('Primera'))
    const ids = movements.map((movement) => movement.id)
    expect(ids).toEqual([...ids].sort((a, b) => b - a))

    // Other test files add movements at the same time, so find this one by its user.
    expect(movements.find((movement) => movement.user_id === anna.userId)).toEqual({
      id: expect.any(Number),
      user_id: anna.userId,
      delta: 20,
      balance_after: 20,
      kind: 'admin_adjustment',
      concept: 'Tercera',
      details: {},
      created_at: expect.any(String),
      who: { username: anna.username },
      event: null,
      // The admin who made it is a real user, so test accounts can't see them.
      actor: null,
    })
  })

  it('REQ-019: a refused adjustment reaches the app as a code it can translate', async () => {
    await expect(
      adjustBalance(
        { requestId: randomUUID(), userId: anna.userId, action: 'remove', amount: 500, concept: 'Massa' },
        await adminClient(),
      ),
    ).rejects.toMatchObject({ code: 'P0001', message: 'insufficient_balance' })
  })
})
