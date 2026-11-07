import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { Profile } from '../auth/AuthProvider'
import { errorMessage } from '../i18n/errors'
import { formatMarcones } from '../i18n/format'
import { text } from '../i18n/text'
import type { MarconaEvent } from '../lib/events'
import { createTapQueue, duelChoices, fetchGameState, gameName, lockIn, type DuelChoice } from '../lib/games'
import { Crown } from '../shell/icons'
import { DuelReveal } from './DuelReveal'
import { Answer, Cancel, People } from './EventActions'
import { StatusPill } from './Events'
import { Payoffs } from './Payoffs'

const glowMs = 2000
const pollMs = 3000

// REQ-202, REQ-203, REQ-204: sends taps in order, and lights a button only once the
// server has saved it. The tap that completes the pair holds the reveal until its
// glow is over, and a tap that came too late goes straight to the reveal.
function useDuelTaps(eventId: string, showReveal: () => void) {
  const [glow, setGlow] = useState<DuelChoice | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const holdingReveal = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const reveal = useRef(showReveal)
  reveal.current = showReveal

  const [queue] = useState(() =>
    createTapQueue({
      send: (choice, requestId) => lockIn({ requestId, eventId, choice }),
      onResult(choice, answer) {
        setFailure(null)
        if (!answer.saved) {
          reveal.current()
          return
        }
        holdingReveal.current ||= answer.revealed
        setGlow(choice)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          setGlow(null)
          if (holdingReveal.current) {
            holdingReveal.current = false
            reveal.current()
          }
        }, glowMs)
      },
      onFailed: (error) => setFailure(errorMessage(error)),
    }),
  )

  useEffect(() => () => clearTimeout(timer.current), [])

  return { glow, failure, tap: queue.tap, holdingReveal, stopGlow: () => holdingReveal.current || setGlow(null) }
}

// REQ-134: works with or without live updates, from when the screen opens until
// the reveal. A failed read just waits for the next one.
function useGamePolling(event: MarconaEvent, onChange: () => void, holdingReveal: RefObject<boolean>) {
  const changed = useRef(onChange)
  changed.current = onChange

  useEffect(() => {
    if (event.status !== 'open') return
    const timer = setInterval(() => {
      fetchGameState(event.id).then(
        (state) => {
          if (!holdingReveal.current && (state.status !== event.status || state.phase !== event.phase)) changed.current()
        },
        () => undefined,
      )
    }, pollMs)
    return () => clearInterval(timer)
  }, [event.id, event.status, event.phase, holdingReveal])
}

// REQ-198: always the same two buttons, and nothing says what was picked before.
function ChoicePanel(props: {
  glow: DuelChoice | null
  failure: string | null
  onTap: (choice: DuelChoice) => void
  onClose: () => void
}) {
  return createPortal(
    <div className="choice-panel" role="dialog" aria-modal="true" aria-label={text.games.panelTitle} data-choice-panel>
      <h2>{text.games.panelTitle}</h2>
      <p className="hint">{text.games.panelHelp}</p>
      {props.failure && (
        <p className="notice" role="alert">
          {props.failure}
        </p>
      )}
      <div className="choice-buttons">
        {duelChoices.map((choice) => (
          <button
            key={choice}
            type="button"
            className="choice-button"
            data-glowing={props.glow === choice}
            onClick={() => props.onTap(choice)}
          >
            {text.games.choices[choice]}
          </button>
        ))}
      </div>
      <button type="button" className="secondary" onClick={props.onClose}>
        {text.games.closePanel}
      </button>
    </div>,
    document.body,
  )
}

// REQ-195: one resting screen for everyone in the duel, whether or not they've
// picked. Nothing here depends on it, because nothing here knows.
export function GameEvent({ event, profile, onChange }: { event: MarconaEvent; profile: Profile; onChange: () => void }) {
  const { glow, failure, tap, holdingReveal, stopGlow } = useDuelTaps(event.id, onChange)
  useGamePolling(event, onChange, holdingReveal)
  const [panelOpen, setPanelOpen] = useState(false)

  const open = event.status === 'open'
  const choosing = open && event.phase === 'choosing'
  const me = event.participants.find((person) => person.who.username === profile.username)
  const settings = event.settings!

  function closePanel() {
    setPanelOpen(false)
    stopGlow()
  }

  return (
    <>
      <div className="event-status-line">
        <StatusPill status={event.status} />
      </div>
      {event.reveal && <DuelReveal event={event} me={profile.username} />}
      <dl className="facts">
        <div>
          <dt>{text.games.game}</dt>
          <dd data-fact="joc">{gameName(event.game!)}</dd>
        </div>
        <div>
          <dt>{text.events.buyIn}</dt>
          <dd data-fact="entrada">{formatMarcones(event.buy_in)}</dd>
        </div>
        {!event.creator_plays && (
          <div data-organiser>
            <dt>{text.games.organiser}</dt>
            <dd className="rank-name">
              <span className="rank-username">{event.creator.username}</span>
              <Crown label={text.events.creator} />
            </dd>
          </div>
        )}
      </dl>
      <section data-game-rules>
        <h2 className="section-title">{text.games.rules}</h2>
        <p className="game-description">{settings.description}</p>
        <Payoffs buyIn={event.buy_in} settings={settings} />
        <p className="hint">{text.games.house}</p>
      </section>
      <People event={event} />
      {open && (
        <div className="event-actions">
          {me?.status === 'invited' && <Answer event={event} onChange={onChange} />}
          <p className="quiet quiet--left" data-game-waiting>
            {choosing ? text.games.choosing : text.games.waitingPlayers}
          </p>
          {choosing && me?.status === 'accepted' && (
            <button type="button" className="primary" onClick={() => setPanelOpen(true)}>
              {text.games.panelTitle}
            </button>
          )}
          {profile.role === 'admin' && <Cancel event={event} onChange={onChange} />}
        </div>
      )}
      {choosing && panelOpen && <ChoicePanel glow={glow} failure={failure} onTap={tap} onClose={closePanel} />}
    </>
  )
}
