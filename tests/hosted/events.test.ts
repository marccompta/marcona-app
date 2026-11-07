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

const answer = (user: TestUser, eventId: string, accept: boolean, requestId = randomUUID()) =>
  user.client.rpc('answer_invitation', { p_request_id: requestId, p_event_id: eventId, p_accept: accept })

async function accepted(user: TestUser, eventId: string, buyIn = 10) {
  await give(user, buyIn)
  const { error } = await answer(user, eventId, true)
  expect(error).toBeNull()
}

describe('answering an invitation', () => {
  it('REQ-079, REQ-099: accepting charges the buy-in at once and makes them a participant', async () => {
    const eventId = await openEvent(anna, [bea])
    await emptyAccount(bea)
    await give(bea, 20)
    const { error } = await answer(bea, eventId, true)

    expect(error).toBeNull()
    expect((await participants(eventId))[bea.userId]).toBe('accepted')
    expect(await balanceOf(bea)).toBe(10)
    expect((await eventMovements(eventId)).at(-1)).toEqual({
      user_id: bea.userId,
      delta: -10,
      kind: 'event_buy_in',
      event_id: eventId,
      actor_id: bea.userId,
    })
  })

  it('REQ-080: without enough marcones they stay invited, and can accept later', async () => {
    const eventId = await openEvent(anna, [bea])
    await emptyAccount(bea)
    await give(bea, 5)
    const requestId = randomUUID()
    const { error } = await answer(bea, eventId, true, requestId)

    expect(error?.message).toBe('insufficient_balance')
    expect((await participants(eventId))[bea.userId]).toBe('invited')
    expect(await balanceOf(bea)).toBe(5)

    await give(bea, 5)
    expect((await answer(bea, eventId, true, requestId)).error).toBeNull()
    expect(await balanceOf(bea)).toBe(0)
  })

  it('REQ-081: declining charges nothing and records the decline', async () => {
    const eventId = await openEvent(anna, [bea])
    await emptyAccount(bea)
    await give(bea, 20)
    const { error } = await answer(bea, eventId, false)

    expect(error).toBeNull()
    expect((await participants(eventId))[bea.userId]).toBe('declined')
    expect(await balanceOf(bea)).toBe(20)
  })

  it('REQ-082: an invitation can only be answered once', async () => {
    const eventId = await openEvent(anna, [bea, cesc])
    await accepted(bea, eventId)
    await give(cesc, 10)
    expect((await answer(cesc, eventId, false)).error).toBeNull()

    for (const [user, accept] of [[bea, true], [bea, false], [cesc, true], [cesc, false]] as const) {
      const { error } = await answer(user, eventId, accept)
      expect(error?.message).toBe('invitation_not_pending')
    }
  })

  it('REQ-082: someone who was never invited has nothing to answer', async () => {
    const eventId = await openEvent(anna, [bea])
    expect((await answer(dani, eventId, true)).error?.message).toBe('invitation_not_pending')
    expect((await answer(anna, eventId, false)).error?.message).toBe('invitation_not_pending')
  })

  it('REQ-082: an event that does not exist has nothing to answer', async () => {
    expect((await answer(bea, randomUUID(), true)).error?.message).toBe('event_not_found')
  })

  it('REQ-062: a double tap on accept charges once', async () => {
    const eventId = await openEvent(anna, [bea])
    await emptyAccount(bea)
    await give(bea, 30)
    const requestId = randomUUID()
    const [first, second] = await Promise.all([answer(bea, eventId, true, requestId), answer(bea, eventId, true, requestId)])
    const third = await answer(bea, eventId, true, requestId)

    expect(first.error).toBeNull()
    expect(second.data).toEqual(first.data)
    expect(third.data).toEqual(first.data)
    expect(await balanceOf(bea)).toBe(20)
  })

  it('REQ-079: several people can accept at the same moment', async () => {
    const eventId = await openEvent(anna, [bea, cesc, dani])
    await Promise.all([bea, cesc, dani].map((user) => give(user, 10)))
    const results = await Promise.all([bea, cesc, dani].map((user) => answer(user, eventId, true)))

    expect(results.map((result) => result.error)).toEqual([null, null, null])
    const everyone = await participants(eventId)
    expect(Object.values(everyone)).toEqual(['accepted', 'accepted', 'accepted', 'accepted'])
  })

  it('REQ-080: accepting two events at once with money for one charges only one', async () => {
    const first = await openEvent(anna, [bea])
    const second = await openEvent(cesc, [bea])
    await emptyAccount(bea)
    await give(bea, 15)
    const results = await Promise.all([answer(bea, first, true), answer(bea, second, true)])

    expect(results.filter((result) => !result.error)).toHaveLength(1)
    expect(results.find((result) => result.error)?.error?.message).toBe('insufficient_balance')
    expect(await balanceOf(bea)).toBe(5)
  })
})

const cancel = (client: TestUser['client'], eventId: string, requestId = randomUUID()) =>
  client.rpc('cancel_event', { p_request_id: requestId, p_event_id: eventId })

const adminId = async () => (await admin.auth.getSession()).data.session!.user.id

describe('cancelling an event', () => {
  async function eventOfThree() {
    const eventId = await openEvent(anna, [bea, cesc])
    await accepted(bea, eventId)
    await accepted(cesc, eventId)
    return { eventId, before: await Promise.all([anna, bea, cesc].map(balanceOf)) }
  }

  const refunded = async (before: number[]) =>
    expect(await Promise.all([anna, bea, cesc].map(balanceOf))).toEqual(before.map((balance) => balance + 10))

  it('REQ-084, REQ-099: the creator cancels, and everyone in is refunded', async () => {
    const { eventId, before } = await eventOfThree()
    const { error } = await cancel(anna.client, eventId)

    expect(error).toBeNull()
    expect(await readEvent(eventId)).toMatchObject({ status: 'cancelled', finished_by: anna.userId })
    await refunded(before)
    const refunds = (await eventMovements(eventId)).filter((movement) => movement.kind === 'event_refund')
    expect(refunds.map((movement) => movement.user_id).sort()).toEqual([anna.userId, bea.userId, cesc.userId].sort())
    for (const refund of refunds) expect(refund).toMatchObject({ delta: 10, event_id: eventId, actor_id: anna.userId })
  })

  it('REQ-085: the admin cancels someone else\'s event, and everyone in is refunded', async () => {
    const { eventId, before } = await eventOfThree()
    const { error } = await cancel(admin, eventId)

    expect(error).toBeNull()
    expect(await readEvent(eventId)).toMatchObject({ status: 'cancelled', finished_by: await adminId() })
    await refunded(before)
  })

  it('REQ-086: nobody else can cancel, not even a participant', async () => {
    const { eventId } = await eventOfThree()
    const before = await Promise.all([anna, bea, cesc].map(balanceOf))

    for (const user of [bea, dani]) {
      const { error } = await cancel(user.client, eventId)
      expect(error?.code).toBe('42501')
    }
    expect((await readEvent(eventId)).status).toBe('open')
    expect(await Promise.all([anna, bea, cesc].map(balanceOf))).toEqual(before)
  })

  it('REQ-087: a participant who has paid cannot withdraw', async () => {
    const { eventId } = await eventOfThree()
    const before = await balanceOf(bea)
    const { error } = await answer(bea, eventId, false)

    expect(error?.message).toBe('invitation_not_pending')
    expect((await participants(eventId))[bea.userId]).toBe('accepted')
    expect(await balanceOf(bea)).toBe(before)
  })

  it('REQ-094, REQ-082: pending invitations lapse, and can no longer be answered', async () => {
    const eventId = await openEvent(anna, [bea, cesc, dani])
    await accepted(bea, eventId)
    await give(cesc, 10)
    expect((await answer(cesc, eventId, false)).error).toBeNull()
    expect((await cancel(anna.client, eventId)).error).toBeNull()

    expect(await participants(eventId)).toEqual({
      [anna.userId]: 'accepted',
      [bea.userId]: 'accepted',
      [cesc.userId]: 'declined',
      [dani.userId]: 'lapsed',
    })
    await give(dani, 10)
    const before = await balanceOf(dani)
    expect((await answer(dani, eventId, true)).error?.message).toBe('event_not_open')
    expect(await balanceOf(dani)).toBe(before)
  })

  it('REQ-083: a cancelled event cannot be cancelled again', async () => {
    const { eventId } = await eventOfThree()
    expect((await cancel(anna.client, eventId)).error).toBeNull()
    const before = await balanceOf(bea)

    expect((await cancel(anna.client, eventId)).error?.message).toBe('event_not_open')
    expect((await cancel(admin, eventId)).error?.message).toBe('event_not_open')
    expect(await balanceOf(bea)).toBe(before)
  })

  it('REQ-062: a double tap on cancel refunds once', async () => {
    const { eventId, before } = await eventOfThree()
    const requestId = randomUUID()
    const [first, second] = await Promise.all([cancel(anna.client, eventId, requestId), cancel(anna.client, eventId, requestId)])

    expect(first.error).toBeNull()
    expect(second.data).toEqual(first.data)
    await refunded(before)
  })

  it('REQ-084: an acceptance at the moment of cancelling never loses marcones', async () => {
    for (let round = 0; round < 5; round += 1) {
      const eventId = await openEvent(anna, [bea])
      await give(bea, 10)
      const before = await balanceOf(bea)
      const [answered, cancelled] = await Promise.all([answer(bea, eventId, true), cancel(anna.client, eventId)])

      expect(cancelled.error).toBeNull()
      if (answered.error) expect(answered.error.message).toBe('event_not_open')
      expect(await balanceOf(bea)).toBe(before)
    }
  })

  it('REQ-085: an event that does not exist cannot be cancelled', async () => {
    expect((await cancel(anna.client, randomUUID())).error?.message).toBe('event_not_found')
  })
})

const complete = (
  user: TestUser,
  eventId: string,
  winners: (TestAccount | null)[],
  requestId = randomUUID(),
) =>
  user.client.rpc('complete_event', {
    p_request_id: requestId,
    p_event_id: eventId,
    p_first: winners[0]?.userId ?? null,
    p_second: winners[1]?.userId ?? null,
    p_third: winners[2]?.userId ?? null,
  })

const payouts = async (eventId: string) =>
  (await eventMovements(eventId)).filter((movement) => movement.kind === 'event_payout')

describe('completing an event', () => {
  async function eventOf(people: TestUser[], fields: Record<string, unknown> = {}) {
    const [creator, ...invited] = people
    const eventId = await openEvent(creator, invited, fields)
    for (const user of invited) await accepted(user, eventId, Number(fields.p_buy_in ?? 10))
    return eventId
  }

  it('REQ-090, REQ-091, REQ-099: with 2 players, the winner takes the whole pot', async () => {
    const eventId = await eventOf([anna, bea])
    const before = await Promise.all([anna, bea].map(balanceOf))
    const { error } = await complete(anna, eventId, [bea])

    expect(error).toBeNull()
    expect(await readEvent(eventId)).toMatchObject({
      status: 'completed',
      finished_by: anna.userId,
      results: [{ place: 1, user_id: bea.userId, percentage: 100, amount: 20 }],
    })
    expect(await Promise.all([anna, bea].map(balanceOf))).toEqual([before[0], before[1] + 20])
    expect(await payouts(eventId)).toEqual([
      { user_id: bea.userId, delta: 20, kind: 'event_payout', event_id: eventId, actor_id: anna.userId },
    ])
  })

  it('REQ-091: with 2 players, the percentages do not matter and the creator can win', async () => {
    const eventId = await eventOf([anna, bea], { p_payout_first: 0, p_payout_second: 60, p_payout_third: 40 })
    const before = await balanceOf(anna)
    expect((await complete(anna, eventId, [anna])).error).toBeNull()
    expect(await balanceOf(anna)).toBe(before + 20)
  })

  it('REQ-091: with 2 players, the winner must be one of them', async () => {
    const eventId = await eventOf([anna, bea])
    for (const winners of [[], [cesc]]) {
      expect((await complete(anna, eventId, winners)).error?.message).toBe('invalid_winners')
    }
    expect((await readEvent(eventId)).status).toBe('open')
  })

  it('REQ-092: each paid place needs a different participant', async () => {
    const eventId = await eventOf([anna, bea, cesc])
    const wrong = [
      [anna, anna, bea],
      [anna, bea, bea],
      [anna, bea, anna],
      [anna, bea, null],
      [null, anna, bea],
      [anna, bea, dani],
    ]
    for (const winners of wrong) {
      expect((await complete(anna, eventId, winners)).error?.message).toBe('invalid_winners')
    }
    expect((await readEvent(eventId)).status).toBe('open')
    expect(await payouts(eventId)).toEqual([])
  })

  it('REQ-092: a place of 0% needs nobody', async () => {
    const eventId = await eventOf([anna, bea, cesc], { p_payout_first: 100, p_payout_second: 0, p_payout_third: 0 })
    expect((await complete(anna, eventId, [bea, bea, bea])).error).toBeNull()
    expect((await readEvent(eventId)).results).toEqual([{ place: 1, user_id: bea.userId, percentage: 100, amount: 30 }])
  })

  // A buy-in of 7 from 3 players makes a pot of 21.
  const roundings = [
    { percentages: [50, 30, 20], amounts: [11, 6, 4] },
    { percentages: [0, 60, 40], amounts: [0, 13, 8] },
    { percentages: [100, 0, 0], amounts: [21, 0, 0] },
  ]

  for (const { percentages, amounts } of roundings) {
    it(`REQ-093: a pot of 21 at ${percentages.join(', ')} pays ${amounts.join(', ')}`, async () => {
      const [first, second, third] = percentages
      const eventId = await eventOf([anna, bea, cesc], {
        p_buy_in: 7,
        p_payout_first: first,
        p_payout_second: second,
        p_payout_third: third,
      })
      const before = await Promise.all([anna, bea, cesc].map(balanceOf))
      expect((await complete(anna, eventId, [anna, bea, cesc])).error).toBeNull()

      expect(await Promise.all([anna, bea, cesc].map(balanceOf))).toEqual(before.map((balance, index) => balance + amounts[index]))
      expect((await payouts(eventId)).reduce((sum, payout) => sum + payout.delta, 0)).toBe(21)
    })
  }

  it('REQ-093, REQ-099: a place that rounds down to 0 gets no movement, and the result still shows it', async () => {
    const eventId = await eventOf([anna, bea, cesc], {
      p_buy_in: 1,
      p_payout_first: 98,
      p_payout_second: 1,
      p_payout_third: 1,
    })
    expect((await complete(anna, eventId, [anna, bea, cesc])).error).toBeNull()

    expect((await payouts(eventId)).map((payout) => [payout.user_id, payout.delta])).toEqual([[anna.userId, 3]])
    expect((await readEvent(eventId)).results).toEqual([
      { place: 1, user_id: anna.userId, percentage: 98, amount: 3 },
      { place: 2, user_id: bea.userId, percentage: 1, amount: 0 },
      { place: 3, user_id: cesc.userId, percentage: 1, amount: 0 },
    ])
  })

  it('REQ-089: it needs at least 2 people in', async () => {
    const eventId = await openEvent(anna, [bea])
    expect((await complete(anna, eventId, [anna])).error?.message).toBe('not_enough_participants')
    expect((await readEvent(eventId)).status).toBe('open')
  })

  it('REQ-089: only the creator can complete, not a participant, an outsider or the admin', async () => {
    const eventId = await eventOf([anna, bea])
    const before = await balanceOf(bea)

    for (const client of [bea.client, dani.client, admin]) {
      const { error } = await client.rpc('complete_event', {
        p_request_id: randomUUID(),
        p_event_id: eventId,
        p_first: bea.userId,
        p_second: null,
        p_third: null,
      })
      expect(error?.code).toBe('42501')
    }
    expect((await readEvent(eventId)).status).toBe('open')
    expect(await balanceOf(bea)).toBe(before)
  })

  it('REQ-094, REQ-082: completing lapses pending invitations, and they can no longer be answered', async () => {
    const eventId = await openEvent(anna, [bea, dani])
    await accepted(bea, eventId)
    expect((await complete(anna, eventId, [bea])).error).toBeNull()

    expect((await participants(eventId))[dani.userId]).toBe('lapsed')
    await give(dani, 10)
    expect((await answer(dani, eventId, true)).error?.message).toBe('event_not_open')
  })

  it('REQ-083: a completed event cannot change', async () => {
    const eventId = await eventOf([anna, bea])
    expect((await complete(anna, eventId, [bea])).error).toBeNull()
    const before = await Promise.all([anna, bea].map(balanceOf))

    expect((await complete(anna, eventId, [anna])).error?.message).toBe('event_not_open')
    expect((await cancel(anna.client, eventId)).error?.message).toBe('event_not_open')
    expect((await cancel(admin, eventId)).error?.message).toBe('event_not_open')
    expect(await Promise.all([anna, bea].map(balanceOf))).toEqual(before)
  })

  it('REQ-062: a double tap on complete pays once', async () => {
    const eventId = await eventOf([anna, bea])
    const before = await balanceOf(bea)
    const requestId = randomUUID()
    const [first, second] = await Promise.all([complete(anna, eventId, [bea], requestId), complete(anna, eventId, [bea], requestId)])

    expect(first.error).toBeNull()
    expect(second.data).toEqual(first.data)
    expect(await balanceOf(bea)).toBe(before + 20)
  })

  it('REQ-083: a completion and a cancellation at the same moment do only one', async () => {
    const eventId = await eventOf([anna, bea])
    const before = await Promise.all([anna, bea].map(balanceOf))
    const results = await Promise.all([complete(anna, eventId, [bea]), cancel(anna.client, eventId)])

    expect(results.filter((result) => !result.error)).toHaveLength(1)
    expect(results.find((result) => result.error)?.error?.message).toBe('event_not_open')
    const moved = (await Promise.all([anna, bea].map(balanceOf))).reduce((sum, balance) => sum + balance, 0)
    expect(moved).toBe(before[0] + before[1] + 20)
  })

  it('REQ-090: an acceptance at the moment of completing is either in the pot or not charged', async () => {
    for (let round = 0; round < 5; round += 1) {
      const eventId = await openEvent(anna, [bea, cesc])
      await accepted(bea, eventId)
      await give(cesc, 10)
      const [answered, completed] = await Promise.all([answer(cesc, eventId, true), complete(anna, eventId, [anna, bea, cesc])])

      expect(completed.error).toBeNull()
      if (answered.error) expect(answered.error.message).toBe('event_not_open')
      const pot = (await payouts(eventId)).reduce((sum, payout) => sum + payout.delta, 0)
      expect(pot).toBe(answered.error ? 20 : 30)
    }
  })

  it('REQ-084: two events with the same people finishing at once never deadlock', async () => {
    for (let round = 0; round < 5; round += 1) {
      const mine = await eventOf([anna, bea, cesc])
      const yours = await eventOf([cesc, bea, anna])
      const results = await Promise.all([cancel(anna.client, mine), cancel(cesc.client, yours)])
      expect(results.map((result) => result.error)).toEqual([null, null])
    }
  })
})

describe('removing a user with events', () => {
  const remove = (user: TestAccount) => callAdminUsers(admin, { action: 'remove', userId: user.userId })

  const isActive = async (user: TestAccount) => {
    const { data, error } = await anna.client.from('profiles').select('removed_at').eq('user_id', user.userId).single()
    expect(error).toBeNull()
    return data!.removed_at === null
  }

  it('REQ-095: declines their pending invitations, and the event carries on', async () => {
    const leaving = await createTestAccount('e-marxa')
    const eventId = await openEvent(anna, [leaving, bea])
    await remove(leaving)

    expect(await participants(eventId)).toEqual({
      [anna.userId]: 'accepted',
      [leaving.userId]: 'declined',
      [bea.userId]: 'invited',
    })
    expect(await isActive(leaving)).toBe(false)
    expect((await readEvent(eventId)).status).toBe('open')
  })

  it('REQ-096: is blocked while they have accepted an open event, and works once it is over', async () => {
    const staying = await createTestUser('e-queda')
    const eventId = await openEvent(anna, [staying])
    await accepted(staying, eventId)

    await expect(remove(staying)).rejects.toEqual({ code: 'user_in_open_event' })
    expect(await isActive(staying)).toBe(true)
    expect((await staying.client.from('profiles').select('username').eq('user_id', staying.userId)).data).toHaveLength(1)

    expect((await cancel(anna.client, eventId)).error).toBeNull()
    await expect(remove(staying)).resolves.toBeDefined()
    expect(await isActive(staying)).toBe(false)
  })

  it('REQ-096: is blocked for the creator of an open event too', async () => {
    const creator = await createTestUser('e-crea')
    const eventId = await openEvent(creator, [bea])

    await expect(remove(creator)).rejects.toEqual({ code: 'user_in_open_event' })
    expect((await cancel(creator.client, eventId)).error).toBeNull()
  })

  it('REQ-096: past events do not block it', async () => {
    const player = await createTestUser('e-passat')
    const eventId = await openEvent(anna, [player])
    await accepted(player, eventId)
    expect((await complete(anna, eventId, [player])).error).toBeNull()

    await expect(remove(player)).resolves.toBeDefined()
  })

  it('REQ-095, REQ-096: an acceptance at the moment of removal does one or the other', async () => {
    for (let round = 0; round < 2; round += 1) {
      const player = await createTestUser(`e-alhora${round}`)
      const eventId = await openEvent(anna, [player])
      await give(player, 10)
      const [answered, removal] = await Promise.allSettled([answer(player, eventId, true), remove(player)])

      expect(answered.status).toBe('fulfilled')
      const refused = answered.status === 'fulfilled' && answered.value.error !== null
      if (refused) {
        expect(removal.status).toBe('fulfilled')
        expect(await balanceOf(player)).toBe(10)
        expect((await participants(eventId))[player.userId]).toBe('declined')
      } else {
        expect(removal).toMatchObject({ status: 'rejected', reason: { code: 'user_in_open_event' } })
        expect(await balanceOf(player)).toBe(0)
        expect((await participants(eventId))[player.userId]).toBe('accepted')
      }
    }
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
