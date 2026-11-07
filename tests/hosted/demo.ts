// Plays the demo accounts during a review, so one phone is enough. It uses the
// admin's login from .env.test.local, so it only runs on the human's machine.
//
//   npm run demo -- fund 100                Sets the admin and each demo player to exactly 100
//   npm run demo -- status                  Lists demo players, balances and pending invitations
//   npm run demo -- accept [event] [player] Accepts pending invitations, optionally only these
//   npm run demo -- decline [event] [player]
//   npm run demo -- invite <event> <buy-in> The first demo player invites the admin to a new event
//
// Demo passwords aren't kept anywhere: each run sets a new random one to log in,
// which also ends any session that player had open.
import { randomBytes, randomUUID } from 'node:crypto'
import { callAdminUsers } from '../../src/lib/adminUsers'
import { adjustBalance, fetchPeople, type Person } from '../../src/lib/data'
import { answerInvitation, createEvent, fetchEvents, groupEvents } from '../../src/lib/events'
import { adminClient, adminLogin, logInAs, signOutAll } from './env'

type Client = Awaited<ReturnType<typeof adminClient>>

const isDemoPlayer = (person: Person) => person.username.startsWith('demo-') && !person.removed_at

async function logInAsPlayer(admin: Client, player: Person) {
  const password = randomBytes(18).toString('base64url')
  await callAdminUsers(admin, { action: 'reset', userId: player.user_id, password })
  return logInAs(player.username, password)
}

async function fund(admin: Client, target: number) {
  if (!Number.isInteger(target) || target < 1) throw new Error('Say how many marcones, such as: fund 100')
  const people = await fetchPeople(admin)
  const accounts = people.filter((person) => isDemoPlayer(person) || person.username === adminLogin().username)

  for (const person of accounts) {
    if (person.balance !== target) {
      await adjustBalance(
        {
          requestId: randomUUID(),
          userId: person.user_id,
          action: person.balance < target ? 'add' : 'remove',
          amount: Math.abs(target - person.balance),
          concept: 'Preparació de la revisió',
        },
        admin,
      )
    }
    console.log(`${person.username}: ${target}`)
  }
}

async function invite(admin: Client, name: string | undefined, buyIn: number) {
  if (!name || !Number.isInteger(buyIn)) throw new Error('Say the event and the buy-in, such as: invite Bitlles 5')
  const people = await fetchPeople(admin)
  const [host] = people.filter(isDemoPlayer).sort((a, b) => a.username.localeCompare(b.username))
  const me = people.find((person) => person.username === adminLogin().username)!

  const client = await logInAsPlayer(admin, host)
  await createEvent(
    { requestId: randomUUID(), name, buyIn, invitees: [me.user_id], payouts: [50, 30, 20], force: false },
    client,
  )
  console.log(`${host.username} invited ${me.username} to ${name}`)
}

async function status(admin: Client) {
  const players = (await fetchPeople(admin)).filter(isDemoPlayer)
  const events = await fetchEvents(admin)

  for (const player of players) {
    const invitations = groupEvents(events, player.username).invitations.map((event) => event.name)
    console.log(`${player.username}: ${player.balance}, invited to: ${invitations.join(', ') || 'nothing'}`)
  }
}

async function answer(admin: Client, accept: boolean, eventName?: string, onlyPlayer?: string) {
  const players = (await fetchPeople(admin)).filter(isDemoPlayer)
  const events = await fetchEvents(admin)
  let answered = 0

  for (const player of players.filter((candidate) => !onlyPlayer || candidate.username === onlyPlayer)) {
    const pending = groupEvents(events, player.username).invitations.filter((event) => !eventName || event.name === eventName)
    if (pending.length === 0) continue

    const client = await logInAsPlayer(admin, player)
    for (const event of pending) {
      await answerInvitation({ requestId: randomUUID(), eventId: event.id, accept }, client)
      console.log(`${player.username} ${accept ? 'accepted' : 'declined'} ${event.name}`)
      answered += 1
    }
  }

  if (answered === 0) console.log('No pending invitations matched.')
}

async function main() {
  const [command, first, second] = process.argv.slice(2)
  const admin = await adminClient()

  if (command === 'fund') return fund(admin, Number(first))
  if (command === 'status') return status(admin)
  if (command === 'accept') return answer(admin, true, first, second)
  if (command === 'decline') return answer(admin, false, first, second)
  if (command === 'invite') return invite(admin, first, Number(second))
  throw new Error('Use one of: fund, status, accept, decline, invite')
}

main()
  .catch((error) => {
    console.error(error.message ?? error)
    process.exitCode = 1
  })
  .finally(signOutAll)
