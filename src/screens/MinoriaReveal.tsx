import { useEffect, useRef, useState } from 'react'
import { formatMarcones } from '../i18n/format'
import { text } from '../i18n/text'
import type { MarconaEvent } from '../lib/events'
import { minoriaChoices, optionLabel, type MinoriaResult, type MinoriaSettings } from '../lib/games'
import { prefersStillness } from '../shell/Balance'
import { alreadySeen, rememberSeen } from './DuelReveal'
import { WinBurst } from './WinBurst'

const words = text.games.minoria

type Stage = 'waiting' | 'turned' | 'done'

const stages: [Stage, number][] = [
  ['turned', 1100],
  ['done', 2600],
]

// REQ-132, REQ-133: both sides turn at once to show how many picked each, then
// the result and every payout. With reduced motion, or on a later visit, it all
// shows at once. It plays once on each device, as a duel's does.
export function MinoriaReveal({ event, me }: { event: MarconaEvent; me: string }) {
  const [live] = useState(() => !alreadySeen(event.id))
  const [stage, setStage] = useState<Stage>(() => (live && !prefersStillness() ? 'waiting' : 'done'))
  const remembered = useRef(false)
  const section = useRef<HTMLElement>(null)

  // Tria en privat is at the bottom of the screen, as in a duel.
  useEffect(() => {
    if (live) section.current?.scrollIntoView({ block: 'start', behavior: prefersStillness() ? 'auto' : 'smooth' })
    // It runs once, when the reveal appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const settings = event.settings as MinoriaSettings
  const result = event.reveal as MinoriaResult
  const name = (userId: string) => event.participants.find((person) => person.user_id === userId)?.who.username ?? userId
  const counts = minoriaChoices.map((choice) => result.players.filter((player) => player.choice === choice).length)
  // The smaller side first, then by name.
  const players = [...result.players].sort(
    (a, b) =>
      Number(b.choice === result.minority) - Number(a.choice === result.minority) ||
      name(a.user_id).localeCompare(name(b.user_id), 'ca'),
  )
  const done = stage === 'done'
  const turned = stage !== 'waiting'
  const gain = (players.find((player) => name(player.user_id) === me)?.payout ?? 0) - event.buy_in

  const verdict =
    result.verdict === 'split'
      ? words.split(optionLabel(settings, result.minority!))
      : result.verdict === 'tie'
        ? words.tie
        : words.unanimous(optionLabel(settings, players[0].choice))
  const detail =
    result.verdict === 'split'
      ? words.splitDetail(Math.min(...counts), Math.max(...counts))
      : result.verdict === 'tie'
        ? words.tieDetail(counts[0])
        : words.unanimousDetail

  return (
    <section ref={section} className="duel-reveal" data-reveal data-stage={stage} aria-live="polite">
      <div className="duel-headline">
        {done ? (
          <>
            <h2 data-verdict>{verdict}</h2>
            <p data-verdict-detail>{detail}</p>
          </>
        ) : (
          <p className="duel-suspense">{words.revealing}</p>
        )}
      </div>
      <div className="duel-stage">
        {minoriaChoices.map((choice, index) => (
          <div key={choice} className="duel-card" data-card data-turned={turned}>
            <span className="duel-card-name">{optionLabel(settings, choice)}</span>
            <div className="duel-card-body">
              <div className="duel-card-back" aria-hidden="true" />
              <div className="duel-card-front" data-tone={turned ? choice : undefined}>
                {turned && <strong data-side-count>{counts[index]}</strong>}
              </div>
            </div>
          </div>
        ))}
        {done && live && gain > 0 && <WinBurst delta={gain} />}
      </div>
      {done && (
        <ul className="event-people">
          {players.map((player) => (
            <li key={player.user_id} className="event-person" data-reveal-player>
              <span className="rank-username">{name(player.user_id)}</span>{' '}
              <span className="event-status">{optionLabel(settings, player.choice)}</span>{' '}
              <span className="event-amount">
                {formatMarcones(player.payout)}
                {result.share !== null && player.user_id === result.remainder_to && player.payout > result.share && (
                  <> {words.remainder}</>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
