import { Link, useParams } from 'react-router'
import { text } from '../i18n/text'
import { fetchMovements, fetchPeople, useLoad } from '../lib/data'
import { useLive, type LiveSource } from '../lib/live'
import { ChipStack, CountUp } from '../shell/Balance'
import { Movements, Pending } from './Movements'

async function loadUser(username: string | undefined) {
  const person = (await fetchPeople()).find((candidate) => candidate.username === username)
  return person ? { person, movements: await fetchMovements(person.user_id) } : null
}

const live: LiveSource[] = [{ table: 'profiles' }, { table: 'ledger' }]

// REQ-066: one person's balance, and every movement on it.
export function UserDetail() {
  const { username } = useParams()
  const { state, reload } = useLoad(() => loadUser(username), username)
  // REQ-150, REQ-151: the balance and movements follow along.
  useLive(live, reload)

  return (
    <section className="screen" data-screen="usuari">
      <Link to="/classificacio" className="back">
        {text.detail.back}
      </Link>
      <h1 className="detail-name">{username}</h1>
      {state.status !== 'ready' && <Pending state={state} />}
      {state.status === 'ready' && !state.data && <p className="quiet">{text.detail.notFound}</p>}
      {state.status === 'ready' && state.data && (
        <>
          <div className="detail-balance">
            <ChipStack balance={state.data.person.balance} large />
            <span className="detail-amount">
              <CountUp value={state.data.person.balance} />
            </span>
          </div>
          <Movements movements={state.data.movements} showWho={false} />
        </>
      )}
    </section>
  )
}
