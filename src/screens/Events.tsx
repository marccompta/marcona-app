import { Link } from 'react-router'
import { formatNumber } from '../i18n/format'
import { text } from '../i18n/text'
import { useLoad } from '../lib/data'
import { fetchEvents, groupEvents, potOf, type EventStatus, type MarconaEvent } from '../lib/events'
import { Pending } from './Movements'

export function StatusPill({ status }: { status: EventStatus }) {
  return <span className={`pill pill--${status}`}>{text.events.status[status]}</span>
}

function EventRow({ event }: { event: MarconaEvent }) {
  return (
    <li>
      <Link to={`/esdeveniments/${event.id}`} className="event-row" data-event>
        <span className="event-name">{event.name}</span>
        <StatusPill status={event.status} />
        <span className="event-meta">
          {text.events.buyIn} {formatNumber(event.buy_in)} · {text.events.pot} {formatNumber(potOf(event))}
        </span>
      </Link>
    </li>
  )
}

function Group({ id, title, empty, events }: { id: string; title: string; empty: string; events: MarconaEvent[] }) {
  return (
    <section data-group={id}>
      <h2 className="section-title">{title}</h2>
      {events.length === 0 ? (
        <p className="quiet quiet--left">{empty}</p>
      ) : (
        <ul className="events">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </ul>
      )}
    </section>
  )
}

// REQ-097: my invitations, open events and past events, in that order.
export function Events({ me }: { me: string }) {
  const { state } = useLoad(fetchEvents)

  return (
    <section className="screen" data-screen="esdeveniments">
      <h1 className="screen-title">{text.events.title}</h1>
      <Link to="/esdeveniments/nou" className="primary primary--link">
        {text.events.new}
      </Link>
      {state.status !== 'ready' && <Pending state={state} />}
      {state.status === 'ready' && <Groups {...groupEvents(state.data, me)} />}
    </section>
  )
}

function Groups({ invitations, open, past }: ReturnType<typeof groupEvents>) {
  return (
    <>
      <Group id="invitacions" title={text.events.invitations} empty={text.events.noInvitations} events={invitations} />
      <Group id="oberts" title={text.events.open} empty={text.events.noOpen} events={open} />
      <Group id="passats" title={text.events.past} empty={text.events.noPast} events={past} />
    </>
  )
}
