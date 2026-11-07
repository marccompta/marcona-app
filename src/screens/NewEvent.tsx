import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { text } from '../i18n/text'
import { fetchPeople, useLoad, type Person } from '../lib/data'
import { createEvent } from '../lib/events'
import { Field, Outcome, plainInput, useAction } from '../shell/Form'
import { Pending } from './Movements'

// REQ-073: the default split.
const defaultPayouts = ['50', '30', '20']

function Form({ people }: { people: Person[] }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [buyIn, setBuyIn] = useState('')
  const [payouts, setPayouts] = useState(defaultPayouts)
  const [invitees, setInvitees] = useState<string[]>([])
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
    const created = await run(async () => {
      await createEvent({
        requestId: id,
        name,
        buyIn: Number(buyIn),
        invitees,
        payouts: [Number(payouts[0]), Number(payouts[1]), Number(payouts[2])],
      })
      return ''
    })
    if (created) navigate('/esdeveniments', { replace: true })
  }

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <Field label={text.events.form.name}>
        <input value={name} maxLength={40} onChange={(event) => changed(setName, event.target.value)} autoComplete="off" />
      </Field>
      <Field label={text.events.buyIn}>
        <input inputMode="numeric" value={buyIn} onChange={(event) => changed(setBuyIn, event.target.value)} {...plainInput} />
      </Field>
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
      <fieldset className="group">
        <legend>{text.events.form.invitees}</legend>
        {people.map((person) => (
          <label key={person.user_id} className="invitee">
            <input type="checkbox" checked={invitees.includes(person.user_id)} onChange={() => toggle(person.user_id)} />
            <span className="tick" />
            {person.username}
          </label>
        ))}
      </fieldset>
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
export function NewEvent({ me }: { me: string }) {
  const { state } = useLoad(fetchPeople)

  return (
    <section className="screen" data-screen="nou-esdeveniment">
      <Link to="/esdeveniments" className="back">
        {text.events.title}
      </Link>
      <h1 className="screen-title">{text.events.new}</h1>
      {state.status !== 'ready' && <Pending state={state} />}
      {state.status === 'ready' && <Form people={others(state.data, me)} />}
    </section>
  )
}
