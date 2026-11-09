import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { errorMessage } from '../../src/i18n/errors'
import { text } from '../../src/i18n/text'
import { adjustBalance, fetchMovements } from '../../src/lib/data'
import { fetchRecentResults, fetchRoulette, saveRouletteSettings, spin, type RouletteSettings, type Spin } from '../../src/lib/roulette'
import { adminClient, createTestUser, publicClient, signOutAll, type TestUser } from './env'

// The settings tests change the real table's settings, so every test that spins
// lives in this file, where tests run one at a time, and they're put back at the end.
const defaults: RouletteSettings = { enabled: true, white_one_in: 37, max_bet_percent: 5 }

let admin: Awaited<ReturnType<typeof adminClient>>
let player: TestUser
let original: RouletteSettings

beforeAll(async () => {
  admin = await adminClient()
  player = await createTestUser('ruleta')
  const { enabled, white_one_in, max_bet_percent } = await fetchRoulette(admin)
  original = { enabled, white_one_in, max_bet_percent }
  await saveRouletteSettings(defaults, admin)
})

afterAll(async () => {
  await saveRouletteSettings(original, admin)
  await signOutAll()
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

describe('the board of last results', () => {
  it('REQ-219: reads my own last 10 spins, newest first, with their results', async () => {
    await setBalance(1000)
    const made: Spin[] = []
    for (let index = 0; index < 12; index += 1) {
      made.push(await spin({ requestId: randomUUID(), choice: 'red', bet: 1 }, player.client))
    }

    const board = await fetchRecentResults(player.client)
    const newest = made.slice(-10).reverse()
    expect(board).toEqual(newest.map((one) => ({ id: one.movement_id, result: one.result })))
  })

  it("REQ-219: never shows another player's spins", async () => {
    const other = await createTestUser('ruleta-b')
    const mine = new Set((await fetchRecentResults(player.client)).map((entry) => entry.id))
    expect(await fetchRecentResults(other.client)).toEqual([])
    expect(mine.size).toBeGreaterThan(0)
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

describe('the maximum bet shown', () => {
  it.each([
    [100, 5],
    [39, 1],
    [1, 1],
    [0, 1],
  ])('REQ-108, REQ-109: with %i marcones it is %i', async (marcones, maximum) => {
    await setBalance(marcones)
    expect(await fetchRoulette(player.client)).toMatchObject({ balance: marcones, max_bet: maximum })
  })
})

describe('the settings', () => {
  afterEach(() => saveRouletteSettings(defaults, admin))

  it('REQ-104, REQ-108: start at 1 in 37 and 5%, with the table open', async () => {
    expect(await fetchRoulette(player.client)).toMatchObject(defaults)
  })

  it('REQ-115: a new white chance applies to later spins', async () => {
    await setBalance(100000)
    await saveRouletteSettings({ ...defaults, white_one_in: 2 }, admin)
    expect(await fetchRoulette(player.client)).toMatchObject({ white_one_in: 2 })

    let whites = 0
    for (let round = 0; round < 60; round += 1) {
      const { result } = await spin({ requestId: randomUUID(), choice: 'red', bet: 1 }, player.client)
      if (result === 'white') whites += 1
    }

    // About 30 at 1 in 2, and about 2 at 1 in 37.
    expect(whites).toBeGreaterThan(12)
  })

  it('REQ-116: a new maximum applies to later spins, and players see it', async () => {
    await setBalance(100)
    await saveRouletteSettings({ ...defaults, max_bet_percent: 10 }, admin)

    expect(await fetchRoulette(player.client)).toMatchObject({ max_bet_percent: 10, max_bet: 10 })
    expect((await bet('red', 11)).error?.message).toBe('bet_too_high')
    expect((await bet('red', 10)).error).toBeNull()
  })

  it('REQ-117, REQ-118: a closed table rejects spins, and reopening lets them back', async () => {
    await setBalance(100)
    await saveRouletteSettings({ ...defaults, enabled: false }, admin)

    expect(await fetchRoulette(player.client)).toMatchObject({ enabled: false })
    const { error } = await bet('red', 1)
    expect(error?.message).toBe('roulette_closed')
    expect(errorMessage(error)).toBe(text.errors.rouletteClosed)
    expect(await balance()).toBe(100)

    await saveRouletteSettings(defaults, admin)
    expect((await bet('red', 1)).error).toBeNull()
  })

  it('REQ-118: a spin that already happened still answers once the table closes', async () => {
    await setBalance(100)
    const requestId = randomUUID()
    const first = await spin({ requestId, choice: 'red', bet: 1 }, player.client)

    await saveRouletteSettings({ ...defaults, enabled: false }, admin)
    expect(await spin({ requestId, choice: 'red', bet: 1 }, player.client)).toEqual(first)
  })

  it.each([
    ['white_one_in', 1, 'invalidWhiteChance'],
    ['white_one_in', 1001, 'invalidWhiteChance'],
    ['white_one_in', 2.5, 'invalidWhiteChance'],
    ['white_one_in', null, 'invalidWhiteChance'],
    ['max_bet_percent', 0, 'invalidMaxBetPercent'],
    ['max_bet_percent', 101, 'invalidMaxBetPercent'],
    ['max_bet_percent', 2.5, 'invalidMaxBetPercent'],
    ['max_bet_percent', null, 'invalidMaxBetPercent'],
  ] as const)('REQ-119: rejects %s of %s, in Catalan, and keeps the settings', async (setting, value, message) => {
    const bad = { ...defaults, [setting]: value } as RouletteSettings
    await expect(saveRouletteSettings(bad, admin)).rejects.toSatisfy((error) => errorMessage(error) === text.errors[message])
    expect(await fetchRoulette(admin)).toMatchObject(defaults)
  })

  it.each([
    ['white_one_in', 2],
    ['white_one_in', 1000],
    ['max_bet_percent', 1],
    ['max_bet_percent', 100],
  ] as const)('REQ-119: accepts the limit %s of %s', async (setting, value) => {
    await saveRouletteSettings({ ...defaults, [setting]: value }, admin)
    expect(await fetchRoulette(admin)).toMatchObject({ [setting]: value })
  })

  it('REQ-119: rejects a missing on or off', async () => {
    const bad = { ...defaults, enabled: null } as unknown as RouletteSettings
    await expect(saveRouletteSettings(bad, admin)).rejects.toMatchObject({ message: 'invalid_roulette_settings' })
  })

  it('REQ-115: a player cannot change them', async () => {
    await expect(saveRouletteSettings({ ...defaults, white_one_in: 1000 }, player.client)).rejects.toMatchObject({
      code: '42501',
    })
    expect(await fetchRoulette(player.client)).toMatchObject(defaults)
  })

  it('REQ-115: the browser cannot reach the table', async () => {
    for (const client of [player.client, admin]) {
      const { data, error } = await client.from('app_settings').select('*')
      expect(data ?? []).toEqual([])
      expect(error).not.toBeNull()
      expect((await client.from('app_settings').update({ value: {} }).eq('key', 'roulette')).error).not.toBeNull()
    }
  })
})

describe('without a login', () => {
  it('REQ-102: nobody spins', async () => {
    const { error } = await publicClient().rpc('spin', { p_request_id: randomUUID(), p_choice: 'red', p_bet: 1 })
    expect(error).not.toBeNull()
  })

  it('REQ-109: nobody reads the table', async () => {
    expect((await publicClient().rpc('roulette_state')).error).not.toBeNull()
  })
})
