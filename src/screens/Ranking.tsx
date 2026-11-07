import { Link } from 'react-router'
import { formatCount, formatMarcones } from '../i18n/format'
import { text } from '../i18n/text'
import { fetchPeople, rankPeople, useLoad } from '../lib/data'
import { ChipStack, CountUp } from '../shell/Balance'
import { EmptyChip } from '../shell/icons'
import { Pending } from './Movements'

const medals = ['gold', 'silver', 'bronze']

export function Ranking({ me }: { me: string }) {
  const { state } = useLoad(fetchPeople)

  return (
    <section className="screen" data-screen="classificacio">
      <h1 className="screen-title">{text.ranking.title}</h1>
      {state.status === 'ready' ? <Table people={rankPeople(state.data)} me={me} /> : <Pending state={state} />}
    </section>
  )
}

function Table({ people, me }: { people: ReturnType<typeof rankPeople>; me: string }) {
  // REQ-011: the empty state stays until there's someone to compare with.
  if (people.length < 2) {
    return (
      <div className="empty">
        <EmptyChip />
        <h2>{text.ranking.emptyTitle}</h2>
        <p>{text.ranking.emptyBody}</p>
      </div>
    )
  }

  const total = people.reduce((sum, person) => sum + person.balance, 0)

  return (
    <>
      <p className="summary">
        {formatCount(people.length, text.units.people)} · {formatMarcones(total)}
      </p>
      <ol className="ranking">
        {people.map((person, index) => (
          <li key={person.user_id}>
            <Link to={`/classificacio/${person.username}`} className="rank-row" data-rank={index + 1}>
              <Place index={index} />
              <span className="rank-name">
                <span className="rank-username">{person.username}</span>
                {person.username === me && <span className="you">{text.ranking.you}</span>}
              </span>
              <ChipStack balance={person.balance} />
              <span className={index < medals.length ? 'rank-amount rank-amount--top' : 'rank-amount'}>
                <CountUp value={person.balance} />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </>
  )
}

function Place({ index }: { index: number }) {
  const medal = medals[index]
  if (!medal) return <span className="place">{index + 1}</span>
  return <span className={`medal medal--${medal}`} data-medal={medal} role="img" aria-label={text.ranking.medals[index]} />
}
