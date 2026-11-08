import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import type { Profile } from '../auth/AuthProvider'
import { text } from '../i18n/text'
import { fetchPeople, useLoad, type Person } from '../lib/data'
import { createEvent } from '../lib/events'
import { createGameEvent, fetchGames, gameName, minoria, type Game } from '../lib/games'
import { Field, Outcome, plainInput, useAction } from '../shell/Form'
import { Pending } from './Movements'

// REQ-073: the default split.
const defaultPayouts = ['50', '30', '20']
const classic = 'classic'

function Form({ people, games, isAdmin }: { people: Person[]; games: Game[]; isAdmin: boolean }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [buyIn, setBuyIn] = useState('')
  const [payouts, setPayouts] = useState(defaultPayouts)
  const [invitees, setInvitees] = useState<string[]>([])
  const [force, setForce] = useState(false)
  const [type, setType] = useState(classic)
  const [plays, setPlays] = useState(true)
  const isGame = type !== classic
  const { busy, outcome, run } = useAction()
  // REQ-062: a retry of the same attempt keeps its ID, so it can't apply twice.
  const requestId = useRef<string | null>(null)

  function changed<T>(setter: (value: T) => void, value: T) {
    requestId.current = null
    setter(value)
  }

  const setPayout = (place: number, value: string) =>
    changed(setPayouts, payouts.map((payout, index) => (index === place ? value : payout)))

  const toggle = (userId: string) =>
    changed(setInvitees, invitees.includes(userId) ? invitees.filter((id) => id !== userId) : [...invitees, userId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    requestId.current ??= crypto.randomUUID()
    const id = requestId.current
    let eventId = ''
    const created = await run(async () => {
      eventId = isGame
        ? await createGameEvent({ requestId: id, game: type, name, buyIn: Number(buyIn), plays, invitees, force })
        : await createEvent({
            requestId: id,
            name,
            buyIn: Number(buyIn),
            invitees,
            payouts: [Number(payouts[0]), Number(payouts[1]), Number(payouts[2])],
            force,
          })
      return ''
    })
    if (created) navigate(`/esdeveniments/${eventId}`, { replace: true })
  }

  return (
    <form className="panel" onSubmit={submit} noValidate>
      {isAdmin && (
        <Field label={text.games.type}>
          <select value={type} onChange={(event) => changed(setType, event.target.value)}>
            <option value={classic}>{text.games.classic}</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {gameName(game.id)}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label={text.events.form.name}>
        <input value={name} maxLength={40} onChange={(event) => changed(setName, event.target.value)} autoComplete="off" />
      </Field>
      <Field label={text.events.buyIn}>
        <input inputMode="numeric" value={buyIn} onChange={(event) => changed(setBuyIn, event.target.value)} {...plainInput} />
      </Field>
      {isGame ? (
        <div className="group">
          <label className="invitee">
            <input type="checkbox" checked={plays} onChange={() => changed(setPlays, !plays)} />
            <span className="tick" />
            {text.games.plays}
          </label>
          <p className="hint">{text.games.playsHelp}</p>
        </div>
      ) : (
        <fieldset className="group">
          <legend>{text.events.form.payouts}</legend>
          <div className="places">
            {text.events.places.map((place, index) => (
              <Field key={place} label={place}>
                <input
                  inputMode="numeric"
                  value={payouts[index]}
                  onChange={(event) => setPayout(index, event.target.value)}
                  {...plainInput}
                />
              </Field>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset className="group">
        <legend>{text.events.form.invitees}</legend>
        {isGame && (
          <p className="hint" data-invite-hint>
            {type === minoria
              ? plays
                ? text.games.minoria.inviteWithMe
                : text.games.minoria.inviteWithoutMe
              : plays
                ? text.games.inviteOne
                : text.games.inviteTwo}
          </p>
        )}
        {people.map((person) => (
          <label key={person.user_id} className="invitee">
            <input type="checkbox" checked={invitees.includes(person.user_id)} onChange={() => toggle(person.user_id)} />
            <span className="tick" />
            {person.username}
          </label>
        ))}
      </fieldset>
      {isAdmin && (
        <div className="group">
          <label className="invitee">
            <input type="checkbox" checked={force} onChange={() => changed(setForce, !force)} />
            <span className="tick" />
            {text.events.form.force}
          </label>
          <p className="hint">{text.events.form.forceHelp}</p>
        </div>
      )}
      <Outcome outcome={outcome?.kind === 'failed' ? outcome : null} />
      <button type="submit" className="primary" disabled={busy}>
        {text.events.form.create}
      </button>
    </form>
  )
}

const others = (people: Person[], me: string) =>
  people
    .filter((person) => !person.removed_at && person.username !== me)
    .sort((a, b) => a.username.localeCompare(b.username, 'ca'))

// REQ-071, REQ-078: anyone can create an event, and invite other active users.
// REQ-186: only the admin is offered forced participation.
// REQ-175, REQ-177: only the admin is offered a game, and only one that's on.
export function NewEvent({ profile }: { profile: Profile }) {
  const isAdmin = profile.role === 'admin'
  const { state } = useLoad(() => Promise.all([fetchPeople(), isAdmin ? fetchGames() : []]))

  return (
    <section className="screen" data-screen="nou-esdeveniment">
      <Link to="/esdeveniments" className="back">
        {text.events.title}
      </Link>
      <h1 className="screen-title">{text.events.new}</h1>
      {state.status !== 'ready' && <Pending state={state} />}
      {state.status === 'ready' && (
        <Form
          people={others(state.data[0], profile.username)}
          games={state.data[1].filter((game) => game.enabled)}
          isAdmin={isAdmin}
        />
      )}
    </section>
  )
}
