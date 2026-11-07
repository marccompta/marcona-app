import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { callAdminUsers } from '../../src/lib/adminUsers'
import { adminClient, createTestAccount, createTestUser, publicClient, signOutAll, type TestAccount, type TestUser } from './env'

afterAll(signOutAll)

// Logging in is what the Auth rate limit counts, so these four play every test.
// Each test makes its own events, and checks changes rather than exact balances.
let admin: Awaited<ReturnType<typeof adminClient>>
let anna: TestUser
let bea: TestUser
let cesc: TestUser
let dani: TestUser

beforeAll(async () => {
  admin = await adminClient()
  ;[anna, bea, cesc, dani] = await Promise.all(['anna', 'bea', 'cesc', 'dani'].map((name) => createTestUser(`e-${name}`)))
})

async function give(user: TestAccount, amount: number) {
  const { error } = await admin.rpc('admin_adjust', {
    p_request_id: randomUUID(),
    p_user_id: user.userId,
    p_action: 'add',
    p_amount: amount,
    p_concept: 'Saldo de prova',
  })
  expect(error).toBeNull()
}

async function take(user: TestAccount, amount: number) {
  const { error } = await admin.rpc('admin_adjust', {
    p_request_id: randomUUID(),
    p_user_id: user.userId,
    p_action: 'remove',
    p_amount: amount,
    p_concept: 'Saldo de prova',
  })
  expect(error).toBeNull()
}

async function balanceOf(user: TestAccount) {
  const { data, error } = await anna.client.from('profiles').select('balance').eq('user_id', user.userId).single()
  expect(error).toBeNull()
  return data!.balance as number
}

async function emptyAccount(user: TestAccount) {
  const balance = await balanceOf(user)
  if (balance > 0) await take(user, balance)
}

const eventFields = (invitees: TestAccount[], fields: Record<string, unknown> = {}) => ({
  p_request_id: randomUUID(),
  p_name: 'Pòquer',
  p_buy_in: 10,
  p_invitees: invitees.map((user) => user.userId),
  p_payout_first: 50,
  p_payout_second: 30,
  p_payout_third: 20,
  ...fields,
})

const tryCreate = (creator: TestUser, invitees: TestAccount[], fields: Record<string, unknown> = {}) =>
  creator.client.rpc('create_event', eventFields(invitees, fields))

// An open event whose creator has just been given the buy-in.
async function openEvent(creator: TestUser, invitees: TestAccount[], fields: Record<string, unknown> = {}) {
  await give(creator, Number(fields.p_buy_in ?? 10))
  const { data, error } = await tryCreate(creator, invitees, fields)
  expect(error).toBeNull()
  return data.event_id as string
}

async function readEvent(eventId: string) {
  const { data, error } = await anna.client.from('events').select('*').eq('id', eventId).single()
  expect(error).toBeNull()
  return data!
}

async function participants(eventId: string) {
  const { data, error } = await anna.client.from('event_participants').select('user_id, status').eq('event_id', eventId)
  expect(error).toBeNull()
  return Object.fromEntries(data!.map((row) => [row.user_id, row.status]))
}

async function eventMovements(eventId: string) {
  const { data, error } = await anna.client
    .from('ledger')
    .select('user_id, delta, kind, event_id, actor_id')
    .eq('event_id', eventId)
    .order('id')
  expect(error).toBeNull()
  return data!
}

describe('creating an event', () => {
  it('REQ-071, REQ-072: creates it open, with the creator in and charged, and the invitee waiting', async () => {
    await emptyAccount(anna)
    await give(anna, 100)
    const { data, error } = await tryCreate(anna, [bea], { p_name: '  Pòquer  ' })

    expect(error).toBeNull()
    expect(await readEvent(data.event_id)).toMatchObject({
      type: 'classic',
      name: 'Pòquer',
      buy_in: 10,
      creator_id: anna.userId,
      status: 'open',
      payout_first: 50,
      payout_second: 30,
      payout_third: 20,
    })
    expect(await participants(data.event_id)).toEqual({ [anna.userId]: 'accepted', [bea.userId]: 'invited' })
    expect(await balanceOf(anna)).toBe(90)
  })

  it('REQ-099: the buy-in is a ledger movement linked to the event', async () => {
    const eventId = await openEvent(anna, [bea])
    expect(await eventMovements(eventId)).toEqual([
      { user_id: anna.userId, delta: -10, kind: 'event_buy_in', event_id: eventId, actor_id: anna.userId },
    ])
  })

  it('REQ-074: accepts a place of 0%', async () => {
    const eventId = await openEvent(anna, [bea], { p_payout_first: 100, p_payout_second: 0, p_payout_third: 0 })
    expect(await readEvent(eventId)).toMatchObject({ payout_first: 100, payout_second: 0, payout_third: 0 })
  })

  async function expectRefused(fields: Record<string, unknown>, invitees: TestAccount[], code: string) {
    await emptyAccount(anna)
    await give(anna, 100)
    const { error } = await tryCreate(anna, invitees, fields)
    expect(error?.message, JSON.stringify(fields)).toBe(code)
    expect(await balanceOf(anna)).toBe(100)
  }

  it('REQ-074: rejects percentages that do not sum to 100, or are not whole places', async () => {
    const wrong = [
      [50, 30, 10],
      [60, 30, 20],
      [120, -20, 0],
      [33.5, 33.5, 33],
      [null, 50, 50],
    ]
    for (const [first, second, third] of wrong) {
      await expectRefused({ p_payout_first: first, p_payout_second: second, p_payout_third: third }, [bea], 'invalid_percentages')
    }
  })

  it('REQ-075: rejects a buy-in that is not a whole number of at least 1', async () => {
    for (const buyIn of [0, 1.5, -3, null]) await expectRefused({ p_buy_in: buyIn }, [bea], 'invalid_buy_in')
  })

  it('REQ-076: rejects a buy-in above the balance', async () => {
    await expectRefused({ p_buy_in: 101 }, [bea], 'insufficient_balance')
  })

  it('REQ-077: rejects an event with no invitees', async () => {
    await expectRefused({}, [], 'no_invitees')
    await expectRefused({ p_invitees: null }, [], 'no_invitees')
  })

  it('REQ-071: a name is required, up to 40 characters', async () => {
    await expectRefused({ p_name: '   ' }, [bea], 'event_name_required')
    await expectRefused({ p_name: null }, [bea], 'event_name_required')
    await expectRefused({ p_name: 'x'.repeat(41) }, [bea], 'event_name_too_long')
    expect((await readEvent(await openEvent(anna, [bea], { p_name: 'x'.repeat(40) }))).name).toHaveLength(40)
  })

  it('REQ-078: invites only other active users', async () => {
    const removed = await createTestAccount('e-baixa')
    await callAdminUsers(admin, { action: 'remove', userId: removed.userId })
    const { data: session } = await admin.auth.getSession()

    await expectRefused({}, [anna], 'invalid_invitee')
    await expectRefused({}, [removed], 'invalid_invitee')
    await expectRefused({ p_invitees: [randomUUID()] }, [], 'invalid_invitee')
    await expectRefused({ p_invitees: [bea.userId, removed.userId] }, [], 'invalid_invitee')
    // A test account can't reach a real user, so real people never get test invitations.
    await expectRefused({ p_invitees: [session.session!.user.id] }, [], 'invalid_invitee')
  })

  it('REQ-078: inviting someone twice counts once', async () => {
    const eventId = await openEvent(anna, [bea, bea])
    expect(await participants(eventId)).toEqual({ [anna.userId]: 'accepted', [bea.userId]: 'invited' })
  })

  it('REQ-062: the same client request ID creates one event and charges once', async () => {
    await emptyAccount(anna)
    await give(anna, 100)
    const fields = eventFields([bea])
    const [first, second] = await Promise.all([anna.client.rpc('create_event', fields), anna.client.rpc('create_event', fields)])
    const third = await anna.client.rpc('create_event', fields)

    expect(first.error).toBeNull()
    expect(second.data).toEqual(first.data)
    expect(third.data).toEqual(first.data)
    expect(await balanceOf(anna)).toBe(90)
  })

  it('REQ-053: someone with no session cannot create one', async () => {
    const { error } = await publicClient().rpc('create_event', eventFields([bea]))
    expect(error?.code).toBe('42501')
  })
})

describe('who can read and write events', () => {
  it('REQ-058: nobody can write to the event tables from the browser', async () => {
    const eventId = await openEvent(anna, [bea])
    const writes = (client: TestUser['client']) =>
      [
        ['insert event', client.from('events').insert({ name: 'x', buy_in: 1, creator_id: anna.userId })],
        ['update event', client.from('events').update({ status: 'cancelled' }).eq('id', eventId)],
        ['delete event', client.from('events').delete().eq('id', eventId)],
        ['insert participant', client.from('event_participants').insert({ event_id: eventId, user_id: cesc.userId, status: 'accepted' })],
        ['update participant', client.from('event_participants').update({ status: 'accepted' }).eq('event_id', eventId)],
        ['delete participant', client.from('event_participants').delete().eq('event_id', eventId)],
      ] as const

    for (const client of [anna.client, admin, publicClient()]) {
      for (const [name, write] of writes(client)) {
        const { error } = await write
        expect(error?.code, name).toBe('42501')
      }
    }
  })

  it('REQ-008: nothing is readable without a login', async () => {
    for (const table of ['events', 'event_participants']) {
      const { data } = await publicClient().from(table).select('*')
      expect(data ?? [], table).toEqual([])
    }
  })

  it('REQ-097: other players can read an event', async () => {
    const eventId = await openEvent(anna, [bea])
    const { data, error } = await dani.client.from('events').select('id').eq('id', eventId)
    expect(error).toBeNull()
    expect(data).toEqual([{ id: eventId }])
  })

  it('REQ-050: real users never see test accounts in events', async () => {
    const eventId = await openEvent(anna, [bea])
    for (const table of ['events', 'event_participants']) {
      const { data, error } = await admin.from(table).select('*').eq(table === 'events' ? 'id' : 'event_id', eventId)
      expect(error, table).toBeNull()
      expect(data, table).toEqual([])
    }
  })
})
