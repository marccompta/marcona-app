// Plays the demo accounts during a review, so one phone is enough. It uses the
// admin's login from .env.test.local, so it only runs on the human's machine.
//
//   npm run demo -- fund 100                Cancels every open event, then sets the admin and
//                                           each demo player to exactly 100, for a clean start
//   npm run demo -- status                  Lists demo players, balances and pending invitations
//   npm run demo -- give <player> <amount>  The admin adds marcones to anyone, as another phone would
//   npm run demo -- accept [event] [player] Accepts pending invitations, optionally only these
//   npm run demo -- decline [event] [player]
//   npm run demo -- invite <event> <buy-in> The first demo player invites the admin to a new event
//   npm run demo -- pick <event> <choice> [player]
//                                           Demo players in that open game lock in, optionally only this one.
//                                           A duel takes confia or traeix, and La minoria either of its labels
//
import { randomUUID } from 'node:crypto'
import { adjustBalance, fetchPeople, type Person } from '../../src/lib/data'
import { answerInvitation, cancelEvent, createEvent, fetchEvents, groupEvents, type MarconaEvent } from '../../src/lib/events'
import {
  lockIn,
  minoria,
  minoriaChoices,
  optionLabel,
  type DuelChoice,
  type MinoriaChoice,
  type MinoriaSettings,
} from '../../src/lib/games'
import { adminClient, adminLogin, logInAsDemo, signOutAll } from './env'

type Client = Awaited<ReturnType<typeof adminClient>>

const isDemoPlayer = (person: Person) => person.username.startsWith('demo-') && !person.removed_at

async function fund(admin: Client, target: number) {
  if (!Number.isInteger(target) || target < 1) throw new Error('Say how many marcones, such as: fund 100')

  // Otherwise an old event's refund, or a second one of the same name, spoils the numbers.
  for (const event of await fetchEvents(admin)) {
    if (event.status !== 'open') continue
    await cancelEvent({ requestId: randomUUID(), eventId: event.id }, admin)
    console.log(`cancelled ${event.name}`)
  }

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

async function give(admin: Client, username: string | undefined, amount: number) {
  if (!username || !Number.isInteger(amount) || amount < 1) throw new Error('Say who and how many, such as: give demo-nuria 25')
  const person = (await fetchPeople(admin)).find((candidate) => candidate.username === username && !candidate.removed_at)
  if (!person) throw new Error(`Nobody active is called ${username}`)
  await adjustBalance(
    { requestId: randomUUID(), userId: person.user_id, action: 'add', amount, concept: 'Revisió en directe' },
    admin,
  )
  console.log(`${username}: ${person.balance + amount}`)
}

async function invite(admin: Client, name: string | undefined, buyIn: number) {
  if (!name || !Number.isInteger(buyIn)) throw new Error('Say the event and the buy-in, such as: invite Bitlles 5')
  const people = await fetchPeople(admin)
  const [host] = people.filter(isDemoPlayer).sort((a, b) => a.username.localeCompare(b.username))
  const me = people.find((person) => person.username === adminLogin().username)!

  const client = await logInAsDemo(admin, host)
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

    const client = await logInAsDemo(admin, player)
    for (const event of pending) {
      await answerInvitation({ requestId: randomUUID(), eventId: event.id, accept }, client)
      console.log(`${player.username} ${accept ? 'accepted' : 'declined'} ${event.name}`)
      answered += 1
    }
  }

  if (answered === 0) console.log('No pending invitations matched.')
}

// A duel takes confia or traeix. La minoria takes either of the game's own labels,
// in any case, or its fixed keys a and b.
function choiceFor(event: MarconaEvent, choice: string): DuelChoice | MinoriaChoice | undefined {
  if (event.game !== minoria) return choice === 'confia' || choice === 'traeix' ? choice : undefined
  const settings = event.settings as MinoriaSettings
  return minoriaChoices.find(
    (key) => choice === key || choice.toLowerCase() === optionLabel(settings, key).toLowerCase(),
  )
}

async function pick(admin: Client, eventName: string | undefined, said: string | undefined, onlyPlayer?: string) {
  if (!eventName || !said) throw new Error('Say the game and the choice, such as: pick Duel traeix, or pick Minoria Blanc')
  const event = (await fetchEvents(admin)).find((candidate) => candidate.name === eventName && candidate.status === 'open')
  if (!event) throw new Error(`No open event is called ${eventName}`)
  const choice = choiceFor(event, said)
  if (!choice) throw new Error(`${said} is not a choice in ${eventName}`)

  const players = (await fetchPeople(admin)).filter(isDemoPlayer)
  const inDuel = players.filter(
    (player) =>
      (!onlyPlayer || player.username === onlyPlayer) &&
      event.participants.some((person) => person.user_id === player.user_id && person.status === 'accepted'),
  )
  if (inDuel.length === 0) console.log('No demo player matched.')

  for (const player of inDuel) {
    const client = await logInAsDemo(admin, player)
    const answer = await lockIn({ requestId: randomUUID(), eventId: event.id, choice }, client)
    console.log(`${player.username} picked ${said}${answer.revealed ? ', and the game is revealed' : ''}`)
  }
}

async function main() {
  const [command, first, second] = process.argv.slice(2)
  const admin = await adminClient()

  if (command === 'fund') return fund(admin, Number(first))
  if (command === 'status') return status(admin)
  if (command === 'give') return give(admin, first, Number(second))
  if (command === 'accept') return answer(admin, true, first, second)
  if (command === 'decline') return answer(admin, false, first, second)
  if (command === 'invite') return invite(admin, first, Number(second))
  if (command === 'pick') return pick(admin, first, second, process.argv[5])
  throw new Error('Use one of: fund, status, give, accept, decline, invite, pick')
}

main()
  .catch((error) => {
    console.error(error.message ?? error)
    process.exitCode = 1
  })
  .finally(signOutAll)
