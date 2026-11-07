import { useRef, useState } from 'react'
import { text } from '../i18n/text'
import { answerInvitation, cancelEvent, type MarconaEvent } from '../lib/events'
import { Outcome, useAction } from '../shell/Form'
import { Crown } from '../shell/icons'

export type ActionProps = { event: MarconaEvent; onChange: () => void }

// REQ-062: a retry of the same attempt keeps its ID, so it can't apply twice.
export function useRequestId() {
  const id = useRef<string | null>(null)
  return {
    current: () => (id.current ??= crypto.randomUUID()),
    clear: () => {
      id.current = null
    },
  }
}

export function Answer({ event, onChange }: ActionProps) {
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

// REQ-084, REQ-085: the first tap only asks, as with a removal.
export function Cancel({ event, onChange }: ActionProps) {
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

export function People({ event }: { event: MarconaEvent }) {
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
