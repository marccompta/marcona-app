import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import type { Profile } from '../auth/AuthProvider'
import { formatMarcones } from '../i18n/format'
import { text } from '../i18n/text'
import { useLoad } from '../lib/data'
import {
  completeEvent,
  fetchEvent,
  inEvent,
  paidPlaces,
  potOf,
  type MarconaEvent,
  type Participant,
} from '../lib/events'
import { Field, Outcome, useAction } from '../shell/Form'
import { Answer, Cancel, People, useRequestId, type ActionProps } from './EventActions'
import { StatusPill } from './Events'
import { GameEvent } from './GameEvent'
import { Pending } from './Movements'

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
          {state.data.type === 'game' ? (
            <GameEvent event={state.data} profile={profile} onChange={reload} />
          ) : (
            <Body event={state.data} profile={profile} onChange={reload} />
          )}
        </>
      )}
    </section>
  )
}
