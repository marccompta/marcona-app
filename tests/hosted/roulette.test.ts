import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorMessage } from '../../src/i18n/errors'
import { text } from '../../src/i18n/text'
import { adjustBalance, fetchMovements } from '../../src/lib/data'
import { spin, type Spin } from '../../src/lib/roulette'
import { adminClient, createTestUser, publicClient, signOutAll, type TestUser } from './env'

afterAll(signOutAll)

let admin: Awaited<ReturnType<typeof adminClient>>
let player: TestUser

beforeAll(async () => {
  admin = await adminClient()
  player = await createTestUser('ruleta')
})

async function balance() {
  const { data, error } = await player.client.from('profiles').select('balance').eq('user_id', player.userId).single()
  expect(error).toBeNull()
  return data!.balance as number
}

// Sets the player's balance exactly, as each test checks its own numbers.
async function setBalance(target: number) {
  const current = await balance()
  if (current === target) return
  await adjustBalance(
    {
      requestId: randomUUID(),
      userId: player.userId,
      action: current < target ? 'add' : 'remove',
      amount: Math.abs(target - current),
      concept: 'Prova de ruleta',
    },
    admin,
  )
}

const bet = (choice: unknown, amount: unknown, requestId = randomUUID()) =>
  player.client.rpc('spin', { p_request_id: requestId, p_choice: choice, p_bet: amount })

const spins = async () => (await fetchMovements(player.userId, player.client)).filter((row) => row.kind === 'roulette_spin')

describe('a spin', () => {
  it('REQ-102, REQ-105, REQ-106: the server decides, and only the chosen colour pays', async () => {
    await setBalance(100000)
    const seen = new Set<string>()
    let expected = 100000

    for (let round = 0; round < 40; round += 1) {
      const choice = round % 2 ? 'red' : 'black'
      const outcome = await spin({ requestId: randomUUID(), choice, bet: 5 }, player.client)
      const won = outcome.result === choice
      expected += won ? 5 : -5
      seen.add(won ? 'won' : 'lost')

      expect(outcome).toMatchObject({ choice, won, bet: 5, delta: won ? 5 : -5, balance_after: expected })
      expect(['red', 'black', 'white']).toContain(outcome.result)
    }

    expect(await balance()).toBe(expected)
    expect([...seen].sort()).toEqual(['lost', 'won'])
  })

  it('REQ-111: one spin is one movement, with the choice and the result', async () => {
    await setBalance(1000)
    const before = (await spins()).length
    const outcome = await spin({ requestId: randomUUID(), choice: 'red', bet: 3 }, player.client)

    const after = await spins()
    expect(after).toHaveLength(before + 1)
    expect(after[0]).toMatchObject({
      delta: outcome.delta,
      balance_after: outcome.balance_after,
      concept: null,
      event: null,
      details: { choice: 'red', result: outcome.result },
    })
  })

  it('REQ-111: anyone can see a spin in the audit', async () => {
    await setBalance(1000)
    const outcome = await spin({ requestId: randomUUID(), choice: 'black', bet: 2 }, player.client)
    const other = await createTestUser('ruleta-veu')

    const [row] = (await fetchMovements(player.userId, other.client)).filter((movement) => movement.kind === 'roulette_spin')
    expect(row).toMatchObject({ who: { username: player.username }, details: { choice: 'black', result: outcome.result } })
  })

  it('REQ-102: repeating a request returns the same spin, and charges once', async () => {
    await setBalance(1000)
    const requestId = randomUUID()
    const first = await spin({ requestId, choice: 'red', bet: 4 }, player.client)
    const again = await spin({ requestId, choice: 'red', bet: 4 }, player.client)

    expect(again).toEqual(first)
    expect(await balance()).toBe(first.balance_after)
  })

  it('REQ-102: the same request sent twice at once applies once', async () => {
    await setBalance(1000)
    const before = (await spins()).length
    const requestId = randomUUID()
    const [first, second] = await Promise.all([
      spin({ requestId, choice: 'red', bet: 4 }, player.client),
      spin({ requestId, choice: 'red', bet: 4 }, player.client),
    ])

    expect(second).toEqual(first)
    expect(await spins()).toHaveLength(before + 1)
  })

  it('REQ-110: spins at the same moment neither deadlock nor overdraw', async () => {
    await setBalance(1)
    const attempts = await Promise.all(Array.from({ length: 6 }, () => bet('red', 1)))

    for (const { error } of attempts) {
      if (error) expect(['insufficient_balance', 'bet_too_high'], error.message).toContain(error.message)
    }

    const applied = attempts.filter(({ error }) => !error).map(({ data }) => data as Spin)
    expect(applied.length).toBeGreaterThan(0)

    // Each movement starts from the balance the last one left.
    const rows = (await spins()).slice(0, applied.length).reverse()
    for (const [index, row] of rows.entries()) {
      if (index > 0) expect(row.balance_after - row.delta).toBe(rows[index - 1].balance_after)
    }
    expect(await balance()).toBe(rows.at(-1)!.balance_after)
    expect(await balance()).toBeGreaterThanOrEqual(0)
  })
})

describe('a bad bet', () => {
  it.each([
    ['0', 0],
    ['-5', -5],
    ['1.5', 1.5],
    ['null', null],
    ['text', 'cinc'],
  ])('REQ-107: rejects %s and changes nothing', async (_name, amount) => {
    await setBalance(100)
    const before = (await spins()).length
    const { error } = await bet('red', amount)

    expect(error).not.toBeNull()
    expect(errorMessage(error)).toMatch(/\S/)
    expect(await balance()).toBe(100)
    expect(await spins()).toHaveLength(before)
  })

  it('REQ-107: says so in Catalan', async () => {
    await setBalance(100)
    const { error } = await bet('red', 0)
    expect(errorMessage(error)).toBe(text.errors.invalidBet)
  })

  it.each(['NaN', 'Infinity'])('REQ-107: rejects %s, which Postgres numbers can hold', async (amount) => {
    await setBalance(100)
    const { error } = await bet('red', amount)
    expect(error).not.toBeNull()
    expect(await balance()).toBe(100)
  })

  it.each(['white', 'blue', '', null])('REQ-102: only red and black can be chosen, not %s', async (choice) => {
    await setBalance(100)
    const { error } = await bet(choice, 1)
    expect(error?.message).toBe('invalid_choice')
    expect(await balance()).toBe(100)
  })
})

describe('the limit', () => {
  it('REQ-110: a bet above the maximum is rejected', async () => {
    await setBalance(100)
    const { error } = await bet('red', 6)

    expect(error?.message).toBe('bet_too_high')
    expect(errorMessage(error)).toBe(text.errors.betTooHigh)
    expect(await balance()).toBe(100)
  })

  it('REQ-108, REQ-110: the maximum itself is allowed', async () => {
    await setBalance(100)
    const { error } = await bet('red', 5)
    expect(error).toBeNull()
  })

  it('REQ-108: the maximum rounds down', async () => {
    await setBalance(39)
    const { error } = await bet('red', 2)
    expect(error?.message).toBe('bet_too_high')
  })

  it('REQ-108: the maximum is never below 1', async () => {
    await setBalance(1)
    const { error } = await bet('red', 1)
    expect(error).toBeNull()
  })

  it('REQ-110: nobody bets what they do not have', async () => {
    await setBalance(0)
    const { error } = await bet('red', 1)

    expect(error?.message).toBe('insufficient_balance')
    expect(await balance()).toBe(0)
  })

  it('REQ-110: a bet far above the balance is rejected', async () => {
    await setBalance(100)
    const { error } = await bet('red', 1000)
    expect(error).not.toBeNull()
    expect(await balance()).toBe(100)
  })
})

describe('without a login', () => {
  it('REQ-102: nobody spins', async () => {
    const { error } = await publicClient().rpc('spin', { p_request_id: randomUUID(), p_choice: 'red', p_bet: 1 })
    expect(error).not.toBeNull()
  })
})
