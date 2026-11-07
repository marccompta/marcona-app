import { useRef, useState, type FormEvent } from 'react'
import { formatMarcones } from '../i18n/format'
import { text } from '../i18n/text'
import { callAdminUsers } from '../lib/adminUsers'
import { adjustBalance, fetchPeople, useLoad, type Person } from '../lib/data'
import { supabase } from '../lib/supabase'
import { ChipStack } from '../shell/Balance'
import { Field, Outcome, plainInput, useAction } from '../shell/Form'
import { Pending } from './Movements'

function CreateUser({ onChange }: { onChange: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { busy, outcome, run } = useAction()

  async function submit(event: FormEvent) {
    event.preventDefault()
    const created = await run(async () => {
      await callAdminUsers(supabase, { action: 'create', username, password })
      return text.admin.created(username)
    })
    if (created) {
      setUsername('')
      setPassword('')
      onChange()
    }
  }

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h2>{text.admin.newUser}</h2>
      <Field label={text.login.username}>
        <input value={username} onChange={(event) => setUsername(event.target.value)} {...plainInput} />
      </Field>
      <Field label={text.login.password}>
        <input value={password} onChange={(event) => setPassword(event.target.value)} {...plainInput} />
      </Field>
      <Outcome outcome={outcome} />
      <button type="submit" className="primary" disabled={busy}>
        {text.admin.create}
      </button>
    </form>
  )
}

function Adjust({ person, onChange }: { person: Person; onChange: () => void }) {
  const [amount, setAmount] = useState('')
  const [concept, setConcept] = useState('')
  const { busy, outcome, run } = useAction()
  // REQ-062: a retry of the same attempt keeps its ID, so it can't apply twice.
  const requestId = useRef<string | null>(null)

  async function submit(action: 'add' | 'remove') {
    requestId.current ??= crypto.randomUUID()
    const id = requestId.current
    const done = await run(async () => {
      await adjustBalance({ requestId: id, userId: person.user_id, action, amount: Number(amount), concept })
      return action === 'add' ? text.admin.added : text.admin.removedMarcones
    })
    if (done) {
      requestId.current = null
      setAmount('')
      setConcept('')
      onChange()
    }
  }

  function edit(setter: (value: string) => void, value: string) {
    requestId.current = null
    setter(value)
  }

  return (
    <form className="panel" onSubmit={(event) => event.preventDefault()} noValidate>
      <h3>{text.admin.marcones}</h3>
      <Field label={text.admin.amount}>
        <input
          inputMode="numeric"
          value={amount}
          onChange={(event) => edit(setAmount, event.target.value)}
          {...plainInput}
        />
      </Field>
      <Field label={text.admin.concept}>
        <input value={concept} onChange={(event) => edit(setConcept, event.target.value)} autoComplete="off" />
      </Field>
      <Outcome outcome={outcome} />
      <div className="actions">
        <button type="button" className="secondary" disabled={busy} onClick={() => void submit('add')}>
          {text.admin.add}
        </button>
        <button type="button" className="secondary" disabled={busy} onClick={() => void submit('remove')}>
          {text.admin.remove}
        </button>
      </div>
    </form>
  )
}

function ResetPassword({ person }: { person: Person }) {
  const [password, setPassword] = useState('')
  const { busy, outcome, run } = useAction()

  async function submit(event: FormEvent) {
    event.preventDefault()
    const done = await run(async () => {
      await callAdminUsers(supabase, { action: 'reset', userId: person.user_id, password })
      return text.admin.passwordChanged
    })
    if (done) setPassword('')
  }

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h3>{text.admin.passwordTitle}</h3>
      <Field label={text.admin.newPassword}>
        <input value={password} onChange={(event) => setPassword(event.target.value)} {...plainInput} />
      </Field>
      <Outcome outcome={outcome} />
      <button type="submit" className="secondary" disabled={busy}>
        {text.admin.changePassword}
      </button>
    </form>
  )
}

// REQ-047: the first tap only asks. Nothing happens until the second.
function RemoveUser({ person, onChange }: { person: Person; onChange: () => void }) {
  const [asking, setAsking] = useState(false)
  const { busy, outcome, run } = useAction()

  async function confirm() {
    const removed = await run(async () => {
      await callAdminUsers(supabase, { action: 'remove', userId: person.user_id })
      return text.admin.removed(person.username)
    })
    setAsking(false)
    if (removed) onChange()
  }

  return (
    <div className="panel">
      <Outcome outcome={outcome} />
      {asking ? (
        <>
          <p className="ask">{text.admin.removeQuestion(person.username)}</p>
          <div className="actions">
            <button type="button" className="secondary secondary--danger" disabled={busy} onClick={() => void confirm()}>
              {text.admin.removeConfirm}
            </button>
            <button type="button" className="secondary" disabled={busy} onClick={() => setAsking(false)}>
              {text.admin.removeCancel}
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="secondary secondary--danger" onClick={() => setAsking(true)}>
          {text.admin.removeUser}
        </button>
      )}
    </div>
  )
}

function UserRow({ person, onChange }: { person: Person; onChange: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <li className="admin-user">
      <button type="button" className="admin-row" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="rank-username">{person.username}</span>
        <ChipStack balance={person.balance} />
        <span className="admin-balance">{formatMarcones(person.balance)}</span>
      </button>
      {open && (
        <div className="admin-panels">
          <Adjust person={person} onChange={onChange} />
          <ResetPassword person={person} />
          <RemoveUser person={person} onChange={onChange} />
        </div>
      )}
    </li>
  )
}

export function Admin() {
  const { state, reload } = useLoad(fetchPeople)

  return (
    <section className="screen" data-screen="administracio">
      <h1 className="screen-title">{text.admin.title}</h1>
      <CreateUser onChange={reload} />
      <h2 className="section-title">{text.admin.users}</h2>
      {state.status !== 'ready' && <Pending state={state} />}
      {state.status === 'ready' && (
        <ul className="admin-users">
          {state.data
            .filter((person) => !person.removed_at)
            .sort((a, b) => a.username.localeCompare(b.username, 'ca'))
            .map((person) => (
              <UserRow key={person.user_id} person={person} onChange={reload} />
            ))}
        </ul>
      )}
    </section>
  )
}
