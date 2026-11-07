import { useState } from 'react'
import { text } from '../i18n/text'
import { fetchMovements, fetchPeople, useLoad } from '../lib/data'
import { useLive, type LiveSource } from '../lib/live'
import { Movements, Pending } from './Movements'

const loadAudit = async () => {
  const [movements, people] = await Promise.all([fetchMovements(), fetchPeople()])
  return { movements, people: people.sort((a, b) => a.username.localeCompare(b.username, 'ca')) }
}

const live: LiveSource[] = [{ table: 'ledger' }, { table: 'profiles' }]

// REQ-067, REQ-068: the whole timeline, or one person's part of it. Removed
// people stay in the filter, because their history stays in the audit.
export function Audit() {
  const { state, reload } = useLoad(loadAudit)
  // REQ-151: new movements appear on every phone, and new people in the filter.
  useLive(live, reload)
  const [userId, setUserId] = useState('')

  return (
    <section className="screen" data-screen="auditoria">
      <h1 className="screen-title">{text.audit.title}</h1>
      {state.status !== 'ready' && <Pending state={state} />}
      {state.status === 'ready' && (
        <>
          <label className="field filter">
            {text.audit.filter}
            <select value={userId} onChange={(event) => setUserId(event.target.value)}>
              <option value="">{text.audit.everyone}</option>
              {state.data.people.map((person) => (
                <option key={person.user_id} value={person.user_id}>
                  {person.removed_at ? `${person.username} ${text.audit.removedSuffix}` : person.username}
                </option>
              ))}
            </select>
          </label>
          <Movements
            movements={userId ? state.data.movements.filter((movement) => movement.user_id === userId) : state.data.movements}
          />
        </>
      )}
    </section>
  )
}
