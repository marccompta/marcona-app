import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Profile } from '../auth/AuthProvider'
import { formatMarcones } from '../i18n/format'
import { text } from '../i18n/text'
import { inEvent, liveEvent, potOf, type MarconaEvent } from '../lib/events'
import {
  fetchGameState,
  fetchMyChoice,
  gameName,
  lockIn,
  minoriaChoices,
  optionLabel,
  startGame,
  type MinoriaChoice,
  type MinoriaSettings,
} from '../lib/games'
import { useLive } from '../lib/live'
import { Outcome, useAction } from '../shell/Form'
import { Crown } from '../shell/icons'
import { Answer, Cancel, People, useRequestId, type ActionProps } from './EventActions'
import { StatusPill } from './Events'
import { useGamePolling } from './GameEvent'
import { MinoriaReveal } from './MinoriaReveal'

const words = text.games.minoria

// REQ-156, REQ-157: only the creator is offered this, and it waits for 3 who have
// paid. The server checks both again.
function Start({ event, onChange }: ActionProps) {
  const { busy, outcome, run } = useAction()
  const request = useRequestId()
  const count = inEvent(event).length
  const ready = count >= 3

  async function begin() {
    const requestId = request.current()
    const done = await run(async () => {
      await startGame({ requestId, eventId: event.id })
      return ''
    })
    if (done) {
      request.clear()
      onChange()
    }
  }

  return (
    <div className="panel">
      <p className="hint" data-start-hint>
        {ready ? words.startReady(count) : words.startWaiting(count)}
      </p>
      <Outcome outcome={outcome?.kind === 'failed' ? outcome : null} />
      <button type="button" className="primary" disabled={!ready || busy} onClick={() => void begin()}>
        {words.start}
      </button>
    </div>
  )
}

// REQ-193, REQ-205: pick an option, then confirm it, because it can't change. A
// locked-in player sees only their own choice. A refusal means another phone got
// there first, so it reads back what was saved.
function ChoicePanel(props: {
  event: MarconaEvent
  settings: MinoriaSettings
  mine: MinoriaChoice | null
  onSaved: (choice: MinoriaChoice | null, revealed: boolean) => void
  onRefused: () => void
  onClose: () => void
}) {
  const [picked, setPicked] = useState<MinoriaChoice | null>(null)
  const { busy, outcome, run } = useAction()
  const request = useRequestId()

  function pick(choice: MinoriaChoice) {
    if (choice !== picked) request.clear()
    setPicked(choice)
  }

  async function confirm() {
    if (!picked) return
    const requestId = request.current()
    let answer = { saved: false, revealed: false }
    const done = await run(async () => {
      answer = await lockIn({ requestId, eventId: props.event.id, choice: picked })
      return ''
    })
    // A pick that came after the reveal saves nothing, and goes to the reveal.
    if (done) props.onSaved(answer.saved ? picked : null, answer.revealed)
    else props.onRefused()
  }

  return createPortal(
    <div className="choice-panel" role="dialog" aria-modal="true" aria-label={text.games.panelTitle} data-choice-panel>
      <h2>{text.games.panelTitle}</h2>
      <Outcome outcome={outcome?.kind === 'failed' ? outcome : null} />
      {props.mine ? (
        <p className="choice-final" data-my-choice>
          {words.myChoice(optionLabel(props.settings, props.mine))}
        </p>
      ) : (
        <>
          <p className="hint">{words.panelHelp}</p>
          <div className="choice-buttons">
            {minoriaChoices.map((choice) => (
              <button
                key={choice}
                type="button"
                className="choice-button"
                data-tone={choice}
                aria-pressed={picked === choice}
                onClick={() => pick(choice)}
              >
                {optionLabel(props.settings, choice)}
              </button>
            ))}
          </div>
          <button type="button" className="primary" disabled={!picked || busy} onClick={() => void confirm()}>
            {picked ? words.confirm(optionLabel(props.settings, picked)) : words.confirmEmpty}
          </button>
        </>
      )}
      <button type="button" className="secondary" onClick={props.onClose}>
        {text.games.closePanel}
      </button>
    </div>,
    document.body,
  )
}

// La minoria's screen. Unlike a duel, everyone sees who has locked in (REQ-197),
// read from game_state() when it opens and on each poll, as a lock-in changes no
// public row and so sends no live update.
export function MinoriaEvent({ event, profile, onChange }: { event: MarconaEvent; profile: Profile; onChange: () => void }) {
  const settings = event.settings as MinoriaSettings & { description: string }
  const open = event.status === 'open'
  const choosing = open && event.phase === 'choosing'
  const me = event.participants.find((person) => person.who.username === profile.username)
  const playing = me?.status === 'accepted'
  const [lockedIn, setLockedIn] = useState<string[]>([])
  const [mine, setMine] = useState<MinoriaChoice | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const neverHolding = useRef(false)

  useGamePolling(event, onChange, neverHolding, (state) => setLockedIn(state.locked_in ?? []))
  useLive(liveEvent(event.id), onChange, { enabled: open })

  function readChoices() {
    fetchGameState(event.id).then((state) => setLockedIn(state.locked_in ?? []), () => undefined)
    if (playing) fetchMyChoice(event.id).then(setMine, () => undefined)
  }

  useEffect(() => {
    if (choosing) readChoices()
    // It reads again only when the game or my part in it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, choosing, playing])

  function saved(choice: MinoriaChoice | null, revealed: boolean) {
    if (choice) setMine(choice)
    if (choice && me) setLockedIn((before) => (before.includes(me.user_id) ? before : [...before, me.user_id]))
    if (revealed) {
      setPanelOpen(false)
      onChange()
    }
  }

  const iHaveChosen = mine !== null || (me !== undefined && lockedIn.includes(me.user_id))

  return (
    <div data-minoria>
      <div className="event-status-line">
        <StatusPill status={event.status} />
      </div>
      {event.reveal && <MinoriaReveal event={event} me={profile.username} />}
      <dl className="facts">
        <div>
          <dt>{text.games.game}</dt>
          <dd data-fact="joc">{gameName(event.game!)}</dd>
        </div>
        <div>
          <dt>{text.events.buyIn}</dt>
          <dd data-fact="entrada">{formatMarcones(event.buy_in)}</dd>
        </div>
        <div>
          <dt>{words.pot}</dt>
          <dd data-fact="pot">{formatMarcones(potOf(event))}</dd>
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
        <p data-options>{words.options(settings.option_a, settings.option_b)}</p>
        <ul className="minoria-rules">
          {words.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>
      <People event={event} lockedIn={choosing ? lockedIn : undefined} />
      {open && (
        <div className="event-actions">
          {me?.status === 'invited' && <Answer event={event} onChange={onChange} />}
          <p className="quiet quiet--left" data-game-waiting>
            {choosing ? (iHaveChosen ? words.chosen : words.choosing) : words.waitingPlayers}
          </p>
          {event.phase === 'inviting' && event.creator.username === profile.username && (
            <Start event={event} onChange={onChange} />
          )}
          {choosing && playing && (
            <button type="button" className="primary" onClick={() => setPanelOpen(true)}>
              {text.games.panelTitle}
            </button>
          )}
          {profile.role === 'admin' && <Cancel event={event} onChange={onChange} />}
        </div>
      )}
      {choosing && panelOpen && (
        <ChoicePanel
          event={event}
          settings={settings}
          mine={mine}
          onSaved={saved}
          onRefused={readChoices}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  )
}
