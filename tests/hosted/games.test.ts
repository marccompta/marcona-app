import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adjustBalance, fetchPeople, type Person } from '../../src/lib/data'
import { cancelEvent, fetchEvent } from '../../src/lib/events'
import { createGameEvent, fetchGameState, lockIn, type DuelChoice } from '../../src/lib/games'
import { adminClient, createTestUser, logInAsDemo, publicClient, signOutAll, type TestUser } from './env'

// The rules and payouts are in tests/sql/games.sql, because a game needs the real
// admin, who can't invite test accounts. This file covers what needs the real API,
// so its duels are between the demo players, and stay on the screens until the wipe.
afterAll(signOutAll)

type Client = Awaited<ReturnType<typeof adminClient>>
type Player = Person & { client: Client }

let admin: Client
let adminId: string
let outsider: TestUser
let nuria: Player
let pau: Player

beforeAll(async () => {
  admin = await adminClient()
  adminId = (await admin.auth.getSession()).data.session!.user.id
  outsider = await createTestUser('g-outsider')

  const demo = (await fetchPeople(admin)).filter((person) => person.username.startsWith('demo-') && !person.removed_at)
  expect(demo.length, 'These tests need the two demo players').toBeGreaterThanOrEqual(2)
  ;[nuria, pau] = await Promise.all(
    demo.slice(0, 2).map(async (person) => ({ ...person, client: await logInAsDemo(admin, person) })),
  )
  for (const userId of [adminId, nuria.user_id, pau.user_id]) {
    await adjustBalance({ requestId: randomUUID(), userId, action: 'add', amount: 1000, concept: 'Saldo de prova' }, admin)
  }
})

const forcedDuel = (plays = false) =>
  createGameEvent(
    {
      requestId: randomUUID(),
      game: 'confia_o_traeix',
      name: 'Prova automàtica',
      buyIn: 10,
      plays,
      invitees: plays ? [nuria.user_id] : [nuria.user_id, pau.user_id],
      force: true,
    },
    admin,
  )

const tap = (client: Client, eventId: string, choice: DuelChoice, requestId: string = randomUUID()) =>
  lockIn({ requestId, eventId, choice }, client)

async function movements(eventId: string, kind: string) {
  const { data, error } = await admin.from('ledger').select('user_id, delta').eq('event_id', eventId).eq('kind', kind)
  expect(error).toBeNull()
  return data!
}

// Everything the API gives this person about the event.
async function everythingVisible(client: Client, eventId: string) {
  const [event, participants, ledger, state] = await Promise.all([
    client.from('events').select('*').eq('id', eventId).single(),
    client.from('event_participants').select('*').eq('event_id', eventId).order('user_id'),
    client.from('ledger').select('*').eq('event_id', eventId).order('id'),
    fetchGameState(eventId, client),
  ])
  return JSON.stringify({ event: event.data, participants: participants.data, ledger: ledger.data, state })
}

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
    for (const client of [outsider.client, nuria.client]) {
      const { error } = await client.rpc('create_game_event', {
        p_request_id: randomUUID(),
        p_game: 'confia_o_traeix',
        p_name: 'Prova',
        p_buy_in: 1,
        p_plays: true,
        p_invitees: [pau.user_id],
        p_force: false,
      })
      expect(error?.code).toBe('42501')
    }
  })
})

describe('secrecy', () => {
  it('REQ-128, REQ-194: a lock-in changes nothing anyone can read, and the reveal shows it all', async () => {
    const eventId = await forcedDuel()
    const before = await Promise.all([admin, nuria.client, pau.client].map((client) => everythingVisible(client, eventId)))

    const answer = await tap(nuria.client, eventId, 'traeix')
    expect(answer).toEqual({ event_id: eventId, saved: true, revealed: false })

    const after = await Promise.all([admin, nuria.client, pau.client].map((client) => everythingVisible(client, eventId)))
    expect(after).toEqual(before)
    for (const seen of after) expect(seen).not.toContain('"choice"')

    await tap(pau.client, eventId, 'confia')
    const { reveal, phase } = await fetchGameState(eventId, admin)
    expect(phase).toBe('revealed')
    expect(reveal?.players.find((player) => player.user_id === nuria.user_id)).toMatchObject({ choice: 'traeix', payout: 25 })
    expect(reveal?.players.find((player) => player.user_id === pau.user_id)).toMatchObject({ choice: 'confia', payout: 0 })
  })

  it('REQ-128: the private schema answers nobody, logged in or not', async () => {
    for (const client of [publicClient(), outsider.client, nuria.client, admin]) {
      const { data, error } = await client.schema('private' as 'public').from('choices').select('*')
      expect(data).toBeNull()
      expect(error?.code).toBe('PGRST106')
    }
  })

  it('REQ-128: private functions are not part of the API', async () => {
    for (const fn of ['resolve_game', 'duel_reveal', 'cancel_open_event']) {
      const { error } = await nuria.client.rpc(fn, {})
      expect(error?.code, fn).toBe('PGRST202')
    }
  })

  it('REQ-128, REQ-194: Realtime sends nothing when someone locks in', async () => {
    const eventId = await forcedDuel()
    const seen: unknown[] = []
    const channel = pau.client
      .channel(`secrecy-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'private', table: 'choices' }, (message) => seen.push(message))
      .on('postgres_changes', { event: '*', schema: 'public' }, (message) => seen.push(message))
    await new Promise((resolve) => channel.subscribe(resolve))

    await tap(nuria.client, eventId, 'confia')
    await new Promise((resolve) => setTimeout(resolve, 2000))

    await pau.client.removeChannel(channel)
    expect(seen).toEqual([])
    await cancelEvent({ requestId: randomUUID(), eventId }, admin)
  })

  it('REQ-194: a test account can read no real game', async () => {
    const eventId = await forcedDuel()
    const { error } = await outsider.client.rpc('game_state', { p_event_id: eventId })
    expect(error?.message).toBe('event_not_found')
    await cancelEvent({ requestId: randomUUID(), eventId }, admin)
  })
})

describe('at the same moment', () => {
  it('REQ-127: both players tapping several times at once reveal and pay exactly once', async () => {
    for (let round = 0; round < 5; round += 1) {
      const eventId = await forcedDuel()
      const answers = await Promise.all([
        tap(nuria.client, eventId, 'confia'),
        tap(pau.client, eventId, 'confia'),
        tap(nuria.client, eventId, 'confia'),
        tap(pau.client, eventId, 'confia'),
      ])
      expect(answers.some((answer) => answer.revealed)).toBe(true)

      const payouts = await movements(eventId, 'event_payout')
      expect(payouts.map((payout) => payout.delta)).toEqual([15, 15])
      expect(new Set(payouts.map((payout) => payout.user_id)).size).toBe(2)
      expect((await fetchEvent(eventId, admin))?.status).toBe('completed')
    }
  })

  it('REQ-204: a change racing the reveal is either saved first or ignored', async () => {
    for (let round = 0; round < 5; round += 1) {
      const eventId = await forcedDuel()
      await tap(nuria.client, eventId, 'confia')
      const [change, last] = await Promise.all([tap(nuria.client, eventId, 'traeix'), tap(pau.client, eventId, 'confia')])

      const { reveal } = await fetchGameState(eventId, admin)
      const shown = reveal!.players.find((player) => player.user_id === nuria.user_id)!
      expect(shown.choice).toBe(change.saved ? 'traeix' : 'confia')
      expect(last.revealed || change.revealed).toBe(true)
    }
  })

  it('REQ-135, REQ-127: a cancel racing the reveal does one or the other, with no deadlock', async () => {
    for (let round = 0; round < 5; round += 1) {
      const eventId = await forcedDuel(true)
      await tap(nuria.client, eventId, 'confia')
      const [tapped, cancelled] = await Promise.allSettled([
        tap(admin, eventId, 'confia'),
        cancelEvent({ requestId: randomUUID(), eventId }, admin),
      ])

      const refusal = (result: PromiseSettledResult<unknown>) =>
        result.status === 'rejected' ? (result.reason as { message: string }).message : null
      const status = (await fetchEvent(eventId, admin))?.status
      const payouts = await movements(eventId, 'event_payout')
      const refunds = await movements(eventId, 'event_refund')

      if (status === 'completed') {
        expect(refusal(cancelled)).toBe('event_not_open')
        expect([payouts.length, refunds.length]).toEqual([2, 0])
      } else {
        expect(status).toBe('cancelled')
        expect(refusal(tapped)).toBe('event_not_open')
        expect([payouts.length, refunds.length]).toEqual([0, 2])
      }
    }
  })

  it('REQ-062: a lost reply retried with the same ID gets the first answer', async () => {
    const eventId = await forcedDuel()
    const requestId = randomUUID()
    const first = await tap(nuria.client, eventId, 'confia', requestId)
    await tap(pau.client, eventId, 'confia')
    expect(await tap(nuria.client, eventId, 'confia', requestId)).toEqual(first)
    expect((await movements(eventId, 'event_payout')).length).toBe(2)
  })
})
