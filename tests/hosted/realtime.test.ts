import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adjustBalance } from '../../src/lib/data'
import { answerInvitation, createEvent } from '../../src/lib/events'
import type { Change } from '../../src/lib/live'
import { adminClient, createTestAccount, createTestUser, signOutAll, type TestUser } from './env'
import { listen, pause, until } from './live'

// Realtime against the real project. Messages arrive a little after the commit,
// so each check waits for what it expects, and a check for silence waits a fixed
// time after a positive control on the same subscription.
afterAll(signOutAll)

type Client = Awaited<ReturnType<typeof adminClient>>

let admin: Client
let viewer: TestUser
let host: TestUser

beforeAll(async () => {
  admin = await adminClient()
  ;[viewer, host] = await Promise.all([createTestUser('rt-viewer'), createTestUser('rt-host')])
})

const about = (userId: string) => (change: Change) => change.record.user_id === userId

describe('live updates', () => {
  it('REQ-150, REQ-151: a balance change reaches another logged-in user', async () => {
    const target = await createTestAccount('rt-target')
    const watch = await listen(viewer.client, [{ table: 'profiles' }, { table: 'ledger' }])
    try {
      await adjustBalance({ requestId: randomUUID(), userId: target.userId, action: 'add', amount: 7, concept: 'Prova' }, admin)
      const arrived = await until(
        () =>
          watch.changes.some((change) => change.table === 'profiles' && about(target.userId)(change)) &&
          watch.changes.some((change) => change.table === 'ledger' && about(target.userId)(change)),
      )
      expect(arrived, JSON.stringify(watch.changes)).toBe(true)
    } finally {
      watch.stop()
    }
  })

  it('REQ-150: Row Level Security still applies, so a real user hears nothing about a test account', async () => {
    const target = await createTestAccount('rt-hidden')
    const [real, test] = await Promise.all([
      listen(admin, [{ table: 'profiles' }, { table: 'ledger' }]),
      listen(viewer.client, [{ table: 'profiles' }, { table: 'ledger' }]),
    ])
    try {
      await adjustBalance({ requestId: randomUUID(), userId: target.userId, action: 'add', amount: 3, concept: 'Prova' }, admin)
      expect(await until(() => test.changes.filter(about(target.userId)).length >= 2)).toBe(true)
      await pause(2000)
      expect(real.changes.filter(about(target.userId))).toEqual([])
    } finally {
      real.stop()
      test.stop()
    }
  })

  it('REQ-152: creating an event and accepting an invitation reach another logged-in user', async () => {
    await adjustBalance({ requestId: randomUUID(), userId: host.userId, action: 'add', amount: 10, concept: 'Prova' }, admin)
    await adjustBalance({ requestId: randomUUID(), userId: viewer.userId, action: 'add', amount: 10, concept: 'Prova' }, admin)
    const watch = await listen(viewer.client, [{ table: 'events' }, { table: 'event_participants' }])
    try {
      const eventId = await createEvent(
        { requestId: randomUUID(), name: 'Prova en directe', buyIn: 2, invitees: [viewer.userId], payouts: [100, 0, 0], force: false },
        host.client,
      )
      expect(await until(() => watch.changes.some((change) => change.table === 'events' && change.record.id === eventId))).toBe(
        true,
      )

      const before = watch.changes.length
      await answerInvitation({ requestId: randomUUID(), eventId, accept: true }, viewer.client)
      const accepted = await until(() =>
        watch.changes
          .slice(before)
          .some((change) => change.table === 'event_participants' && change.record.event_id === eventId && change.record.status === 'accepted'),
      )
      expect(accepted).toBe(true)
    } finally {
      watch.stop()
    }
  })
})
