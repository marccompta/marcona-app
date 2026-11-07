import { useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import type { Profile } from '../auth/AuthProvider'
import { formatMarcones } from '../i18n/format'
import { text } from '../i18n/text'
import { useLoad } from '../lib/data'
import {
  answerInvitation,
  cancelEvent,
  completeEvent,
  fetchEvent,
  inEvent,
  paidPlaces,
  potOf,
  type MarconaEvent,
  type Participant,
} from '../lib/events'
import { Crown } from '../shell/icons'
import { Field, Outcome, useAction } from '../shell/Form'
import { StatusPill } from './Events'
import { Pending } from './Movements'

type ActionProps = { event: MarconaEvent; onChange: () => void }

// REQ-062: a retry of the same attempt keeps its ID, so it can't apply twice.
function useRequestId() {
  const id = useRef<string | null>(null)
  return {
    current: () => (id.current ??= crypto.randomUUID()),
    clear: () => {
      id.current = null
    },
  }
}

function Answer({ event, onChange }: ActionProps) {
  const { busy, outcome, run } = useAction()
  const request = useRequestId()

  async function answer(accept: boolean) {
    const requestId = request.current()
    const done = await run(async () => {
      await answerInvitation({ requestId, eventId: event.id, accept })
      return ''
    })
    if (done) {
      request.clear()
      onChange()
    }
  }

  return (
    <div className="panel">
      <h2>{text.events.invitation}</h2>
      <Outcome outcome={outcome?.kind === 'failed' ? outcome : null} />
      <div className="actions">
        <button type="button" className="primary" disabled={busy} onClick={() => void answer(true)}>
          {text.events.accept}
        </button>
        <button type="button" className="secondary" disabled={busy} onClick={() => void answer(false)}>
          {text.events.decline}
        </button>
      </div>
    </div>
  )
}

// REQ-091, REQ-092: one winner with 2 people, or someone for each paid place.
function Complete({ event, onChange }: ActionProps) {
  const players = inEvent(event)
  const places = paidPlaces(event)
  const [winners, setWinners] = useState<string[]>(['', '', ''])
  const { busy, outcome, run } = useAction()
  const request = useRequestId()

  function choose(place: number, userId: string) {
    request.clear()
    setWinners(winners.map((winner, index) => (index === place ? userId : winner)))
  }

  async function submit(submitted: FormEvent) {
    submitted.preventDefault()
    const requestId = request.current()
    const chosen = winners.map((winner) => winner || null) as [string | null, string | null, string | null]
    const done = await run(async () => {
      await completeEvent({ requestId, eventId: event.id, winners: chosen })
      return ''
    })
    if (done) {
      request.clear()
      onChange()
    }
  }

  if (players.length < 2) return <p className="quiet quiet--left">{text.events.needTwo}</p>

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h2>{text.events.complete}</h2>
      {players.length === 2 ? (
        <>
          <p className="hint">{text.events.twoPlayers}</p>
          <Picker label={text.events.winner} players={players} value={winners[0]} onChange={(userId) => choose(0, userId)} />
        </>
      ) : (
        places.map(({ index, name, percentage }) => (
          <Picker
            key={index}
            label={`${text.events.placeLabel(name)} (${percentage}%)`}
            players={players}
            value={winners[index]}
            onChange={(userId) => choose(index, userId)}
          />
        ))
      )}
      <Outcome outcome={outcome?.kind === 'failed' ? outcome : null} />
      <button type="submit" className="primary" disabled={busy}>
        {text.events.completeAndPay}
      </button>
    </form>
  )
}

function Picker(props: { label: string; players: Participant[]; value: string; onChange: (userId: string) => void }) {
  return (
    <Field label={props.label}>
      <select value={props.value} onChange={(event) => props.onChange(event.target.value)}>
        <option value="">{text.events.choose}</option>
        {[...props.players]
          .sort((a, b) => a.who.username.localeCompare(b.who.username, 'ca'))
          .map((player) => (
            <option key={player.user_id} value={player.user_id}>
              {player.who.username}
            </option>
          ))}
      </select>
    </Field>
  )
}

// REQ-084, REQ-085: the first tap only asks, as with a removal.
function Cancel({ event, onChange }: ActionProps) {
  const [asking, setAsking] = useState(false)
  const { busy, outcome, run } = useAction()
  const request = useRequestId()

  async function confirm() {
    const requestId = request.current()
    const done = await run(async () => {
      await cancelEvent({ requestId, eventId: event.id })
      return ''
    })
    setAsking(false)
    if (done) {
      request.clear()
      onChange()
    }
  }

  return (
    <div className="panel">
      <Outcome outcome={outcome?.kind === 'failed' ? outcome : null} />
      {asking ? (
        <>
          <p className="ask">{text.events.cancelQuestion}</p>
          <div className="actions">
            <button type="button" className="secondary secondary--danger" disabled={busy} onClick={() => void confirm()}>
              {text.events.cancelConfirm}
            </button>
            <button type="button" className="secondary" disabled={busy} onClick={() => setAsking(false)}>
              {text.events.cancelBack}
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="secondary secondary--danger" onClick={() => setAsking(true)}>
          {text.events.cancel}
        </button>
      )}
    </div>
  )
}

function Results({ event }: { event: MarconaEvent }) {
  const name = (userId: string) => event.participants.find((person) => person.user_id === userId)?.who.username

  return (
    <>
      <h2 className="section-title">{text.events.results}</h2>
      <ol className="event-people">
        {event.results?.map((place) => (
          <li key={place.place} className="event-person" data-place>
            <span className="event-place">{text.events.places[place.place - 1]}</span>{' '}
            <span className="rank-username">{name(place.user_id)}</span>{' '}
            <span className="event-amount">{formatMarcones(place.amount)}</span>
          </li>
        ))}
      </ol>
    </>
  )
}

function People({ event }: { event: MarconaEvent }) {
  const creatorFirst = [...event.participants].sort(
    (a, b) =>
      Number(b.user_id === event.creator_id) - Number(a.user_id === event.creator_id) ||
      a.who.username.localeCompare(b.who.username, 'ca'),
  )

  return (
    <>
      <h2 className="section-title">{text.events.participants}</h2>
      <ul className="event-people">
        {creatorFirst.map((person) => (
          <li key={person.user_id} className="event-person" data-participant>
            <span className="rank-name">
              <span className="rank-username">{person.who.username}</span>
              {person.user_id === event.creator_id && <Crown label={text.events.creator} />}
            </span>
            <span className={person.status === 'accepted' ? 'event-status event-status--in' : 'event-status'}>
              {text.events.people[person.status]}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

function Body({ event, profile, onChange }: ActionProps & { profile: Profile }) {
  const open = event.status === 'open'
  const isCreator = event.creator.username === profile.username
  const invited = event.participants.some((person) => person.who.username === profile.username && person.status === 'invited')

  return (
    <>
      <div className="event-status-line">
        <StatusPill status={event.status} />
      </div>
      <dl className="facts">
        <div>
          <dt>{text.events.buyIn}</dt>
          <dd data-fact="entrada">{formatMarcones(event.buy_in)}</dd>
        </div>
        <div>
          <dt>{text.events.pot}</dt>
          <dd data-fact="pot">{formatMarcones(potOf(event))}</dd>
        </div>
        <div>
          <dt>{text.events.payoutRule}</dt>
          <dd data-fact="premis">{paidPlaces(event).map(({ name, percentage }) => `${name} ${percentage}%`).join(' · ')}</dd>
        </div>
      </dl>
      {event.status === 'completed' && <Results event={event} />}
      <People event={event} />
      {open && (
        <div className="event-actions">
          {invited && <Answer event={event} onChange={onChange} />}
          {isCreator && <Complete event={event} onChange={onChange} />}
          {(isCreator || profile.role === 'admin') && <Cancel event={event} onChange={onChange} />}
        </div>
      )}
    </>
  )
}

// REQ-098: everything about one event, and what this person can do with it.
export function EventDetail({ profile }: { profile: Profile }) {
  const { id } = useParams()
  const { state, reload } = useLoad(() => fetchEvent(id!), id)

  return (
    <section className="screen" data-screen="esdeveniment">
      <Link to="/esdeveniments" className="back">
        {text.events.title}
      </Link>
      {state.status !== 'ready' && <Pending state={state} />}
      {state.status === 'ready' && !state.data && <p className="quiet">{text.errors.eventNotFound}</p>}
      {state.status === 'ready' && state.data && (
        <>
          <h1 className="detail-name">{state.data.name}</h1>
          <Body event={state.data} profile={profile} onChange={reload} />
        </>
      )}
    </section>
  )
}
