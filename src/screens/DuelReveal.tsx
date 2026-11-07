import { useEffect, useRef, useState } from 'react'
import { formatMarcones } from '../i18n/format'
import { text } from '../i18n/text'
import type { MarconaEvent } from '../lib/events'
import { duelVerdict, type RevealedPlayer } from '../lib/games'
import { prefersStillness } from '../shell/Balance'
import { WinBurst } from './WinBurst'

type Stage = 'waiting' | 'first' | 'second' | 'done'

const stages: [Stage, number][] = [
  ['first', 1100],
  ['second', 2500],
  ['done', 3700],
]

// Storage can be blocked or empty. Then the reveal simply plays again.
const seenKey = (eventId: string) => `marcona-reveal-${eventId}`

function alreadySeen(eventId: string) {
  try {
    return localStorage.getItem(seenKey(eventId)) !== null
  } catch {
    return false
  }
}

function rememberSeen(eventId: string) {
  try {
    localStorage.setItem(seenKey(eventId), '1')
  } catch {
    // Nothing to do: the only cost is seeing it again.
  }
}

function Card({ name, player, turned }: { name: string; player: RevealedPlayer; turned: boolean }) {
  return (
    <div className="duel-card" data-card data-turned={turned}>
      <span className="duel-card-name">{name}</span>
      <div className="duel-card-body">
        <div className="duel-card-back" aria-hidden="true" />
        <div className="duel-card-front" data-tone={turned ? player.choice : undefined}>
          {turned && <strong data-choice={player.choice}>{text.games.choices[player.choice]}</strong>}
        </div>
      </div>
    </div>
  )
}

// REQ-132, REQ-133: the cards turn one at a time, mine first, and the result waits
// for the second. With reduced motion, or on a later visit, it all shows at once.
export function DuelReveal({ event, me }: { event: MarconaEvent; me: string }) {
  const [live] = useState(() => !alreadySeen(event.id))
  const [stage, setStage] = useState<Stage>(() => (live && !prefersStillness() ? 'waiting' : 'done'))
  const remembered = useRef(false)

  useEffect(() => {
    if (stage === 'done') return
    const timers = stages.map(([next, wait]) => setTimeout(() => setStage(next), wait))
    return () => timers.forEach(clearTimeout)
    // It runs once, when the reveal appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (stage !== 'done' || remembered.current) return
    remembered.current = true
    rememberSeen(event.id)
  }, [stage, event.id])

  const name = (userId: string) => event.participants.find((person) => person.user_id === userId)?.who.username ?? ''
  const players = [...event.reveal!.players].sort(
    (a, b) => Number(name(b.user_id) === me) - Number(name(a.user_id) === me) || name(a.user_id).localeCompare(name(b.user_id), 'ca'),
  )
  const verdict = duelVerdict(players)
  const traitor = players.find((player) => player.choice === 'traeix')
  const victim = players.find((player) => player.choice === 'confia')
  const done = stage === 'done'
  const gain = (players.find((player) => name(player.user_id) === me)?.payout ?? 0) - event.buy_in

  return (
    <section className="duel-reveal" data-reveal data-stage={stage} aria-live="polite">
      <div className="duel-headline">
        {done ? (
          <>
            <h2 data-verdict>{text.games.verdicts[verdict]}</h2>
            {verdict === 'betrayal' && (
              <p data-verdict-detail>{text.games.betrayedBy(name(traitor!.user_id), name(victim!.user_id))}</p>
            )}
          </>
        ) : (
          <p className="duel-suspense">{text.games.revealing}</p>
        )}
      </div>
      <div className="duel-stage">
        {players.map((player, index) => (
          <Card
            key={player.user_id}
            name={name(player.user_id)}
            player={player}
            turned={done || (stage === 'first' && index === 0) || stage === 'second'}
          />
        ))}
        {done && live && gain > 0 && <WinBurst delta={gain} />}
      </div>
      {done && (
        <ul className="event-people">
          {players.map((player) => (
            <li key={player.user_id} className="event-person" data-reveal-player>
              <span className="rank-username">{name(player.user_id)}</span>{' '}
              <span className="event-status">{text.games.choices[player.choice]}</span>{' '}
              <span className="event-amount">{formatMarcones(player.payout)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
