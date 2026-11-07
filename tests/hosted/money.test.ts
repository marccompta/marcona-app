import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  adminClient,
  createTestAccount,
  createTestUser,
  publicClient,
  signOutAll,
  type TestAccount,
  type TestUser,
} from './env'

type Action = 'add' | 'remove'

afterAll(signOutAll)

let admin: Awaited<ReturnType<typeof adminClient>>
let viewer: TestUser

beforeAll(async () => {
  admin = await adminClient()
  viewer = await createTestUser('mirador')
})

const adjust = (userId: string, action: Action, amount: number, concept: string | null = 'Prova', requestId = randomUUID()) =>
  admin.rpc('admin_adjust', {
    p_request_id: requestId,
    p_user_id: userId,
    p_action: action,
    p_amount: amount,
    p_concept: concept,
  })

async function userWith(name: string, balance: number) {
  const user = await createTestAccount(name)
  if (balance > 0) {
    const { error } = await adjust(user.userId, 'add', balance, 'Saldo inicial')
    expect(error).toBeNull()
  }
  return user
}

async function balanceOf(user: TestAccount) {
  const { data, error } = await viewer.client.from('profiles').select('balance').eq('user_id', user.userId).single()
  expect(error).toBeNull()
  return data!.balance as number
}

async function movementsOf(user: TestAccount) {
  const { data, error } = await viewer.client
    .from('ledger')
    .select('delta, balance_after, kind, concept, actor_id')
    .eq('user_id', user.userId)
    .order('id', { ascending: false })
  expect(error).toBeNull()
  return data!
}

describe('the ledger', () => {
  it('REQ-060: a user with no movements has an empty ledger', async () => {
    const user = await createTestAccount('buida')
    expect(await movementsOf(user)).toEqual([])
  })

  it('REQ-008: nothing is readable without a login', async () => {
    const { data } = await publicClient().from('ledger').select('id')
    expect(data ?? []).toEqual([])
  })
})

describe('admin adjustments', () => {
  it('REQ-039, REQ-060: adding raises the balance and records the movement', async () => {
    const user = await userWith('suma', 10)
    const { data, error } = await adjust(user.userId, 'add', 5, 'Benvinguda')

    expect(error).toBeNull()
    expect(data).toMatchObject({ delta: 5, balance_after: 15 })
    expect(await balanceOf(user)).toBe(15)
    expect((await movementsOf(user))[0]).toMatchObject({
      delta: 5,
      balance_after: 15,
      kind: 'admin_adjustment',
      concept: 'Benvinguda',
      actor_id: expect.any(String),
    })
  })

  it('REQ-040: removing lowers the balance and records the movement', async () => {
    const user = await userWith('resta', 10)
    const { error } = await adjust(user.userId, 'remove', 4, 'Correcció')

    expect(error).toBeNull()
    expect(await balanceOf(user)).toBe(6)
    expect((await movementsOf(user))[0]).toMatchObject({ delta: -4, balance_after: 6, concept: 'Correcció' })
  })

  it('REQ-041: a missing or blank Concept is rejected', async () => {
    const user = await userWith('concepte', 10)
    for (const concept of [null, '', '   ']) {
      const { error } = await adjust(user.userId, 'add', 5, concept)
      expect(error?.message, String(concept)).toBe('concept_required')
    }
    expect(await balanceOf(user)).toBe(10)
  })

  it('REQ-042: an amount that is not a whole number of at least 1 is rejected', async () => {
    const user = await userWith('import', 10)
    for (const amount of [0, 1.5, -3]) {
      const { error } = await adjust(user.userId, 'add', amount)
      expect(error?.message, String(amount)).toBe('invalid_amount')
    }
    expect(await balanceOf(user)).toBe(10)
    expect(await movementsOf(user)).toHaveLength(1)
  })

  it('REQ-043, REQ-061: a removal below 0 is rejected and changes nothing', async () => {
    const user = await userWith('poc', 3)
    const { error } = await adjust(user.userId, 'remove', 5)

    expect(error?.message).toBe('insufficient_balance')
    expect(await balanceOf(user)).toBe(3)
    expect(await movementsOf(user)).toHaveLength(1)
  })

  it('REQ-062: the same client request ID applies once and returns the first result', async () => {
    const user = await userWith('doble-toc', 10)
    const requestId = randomUUID()
    const first = await adjust(user.userId, 'add', 5, 'Doble toc', requestId)
    const second = await adjust(user.userId, 'add', 5, 'Doble toc', requestId)

    expect(first.error).toBeNull()
    expect(second.error).toBeNull()
    expect(second.data).toEqual(first.data)
    expect(await balanceOf(user)).toBe(15)
    expect(await movementsOf(user)).toHaveLength(2)
  })

  it('REQ-062: two sends of one request at the same moment still apply once', async () => {
    const user = await userWith('alhora', 10)
    const requestId = randomUUID()
    const [first, second] = await Promise.all([
      adjust(user.userId, 'add', 5, 'Alhora', requestId),
      adjust(user.userId, 'add', 5, 'Alhora', requestId),
    ])

    expect(first.error).toBeNull()
    expect(second.error).toBeNull()
    expect(second.data).toEqual(first.data)
    expect(await balanceOf(user)).toBe(15)
  })

  it('REQ-057: of two removals at the same moment, exactly one succeeds', async () => {
    const user = await userWith('carrera', 10)
    const results = await Promise.all([adjust(user.userId, 'remove', 6), adjust(user.userId, 'remove', 6)])

    expect(results.filter((result) => !result.error)).toHaveLength(1)
    expect(results.find((result) => result.error)?.error?.message).toBe('insufficient_balance')
    expect(await balanceOf(user)).toBe(4)
    const history = await movementsOf(user)
    expect(history).toHaveLength(2)
    expect(history[0]).toMatchObject({ delta: -6, balance_after: 4 })
  })

  it('REQ-055: a player cannot adjust anyone', async () => {
    const { error } = await viewer.client.rpc('admin_adjust', {
      p_request_id: randomUUID(),
      p_user_id: viewer.userId,
      p_action: 'add',
      p_amount: 1000,
      p_concept: 'Regal',
    })

    expect(error?.code).toBe('42501')
    expect(await balanceOf(viewer)).toBe(0)
  })
})

describe('direct writes with the public key', () => {
  const writes = (client: TestUser['client']) =>
    [
      ['insert into profiles', client.from('profiles').insert({ user_id: viewer.userId, username: 'intrusa' })],
      ['update my balance', client.from('profiles').update({ balance: 1000 }).eq('user_id', viewer.userId)],
      ['make me admin', client.from('profiles').update({ role: 'admin' }).eq('user_id', viewer.userId)],
      ['undo a removal', client.from('profiles').update({ removed_at: null }).eq('user_id', viewer.userId)],
      ['delete a profile', client.from('profiles').delete().eq('user_id', viewer.userId)],
      [
        'insert into ledger',
        client.from('ledger').insert({ user_id: viewer.userId, delta: 5, balance_after: 5, kind: 'admin_adjustment' }),
      ],
      ['update a ledger row', client.from('ledger').update({ delta: 500 }).gt('id', 0)],
      ['delete a ledger row', client.from('ledger').delete().gt('id', 0)],
    ] as const

  it('REQ-058, REQ-059: a player cannot write to any table, or change a ledger row', async () => {
    for (const [name, write] of writes(viewer.client)) {
      const { error } = await write
      expect(error?.code, name).toBe('42501')
    }
    expect(await balanceOf(viewer)).toBe(0)
  })

  it('REQ-058, REQ-059: nor can the admin, from the browser', async () => {
    for (const [name, write] of writes(admin)) {
      const { error } = await write
      expect(error?.code, name).toBe('42501')
    }
  })

  it('REQ-058: nor can someone with no session', async () => {
    for (const [name, write] of writes(publicClient())) {
      const { error } = await write
      expect(error?.code, name).toBe('42501')
    }
  })

  it('REQ-058: the private schema is out of reach', async () => {
    const { error } = await viewer.client.schema('private' as never).from('money_requests').select('*')
    expect(error).not.toBeNull()
  })
})
