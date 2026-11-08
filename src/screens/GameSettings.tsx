import { useState, type FormEvent } from 'react'
import { formatMarcones } from '../i18n/format'
import { text } from '../i18n/text'
import { useLoad } from '../lib/data'
import { fetchGames, gameName, saveGameSettings, type DuelSettings, type Game } from '../lib/games'
import { Field, Outcome, plainInput, useAction } from '../shell/Form'
import { Pending } from './Movements'
import { Payoffs } from './Payoffs'

const exampleBuyIn = 10
const fields: (keyof DuelSettings)[] = ['both_trust', 'betrayer', 'betrayed', 'both_betray']

const wholeNumber = /^\d+$/

// REQ-146, REQ-147: applies to new events. The server checks the values (REQ-144).
function DuelForm({ loaded }: { loaded: Game }) {
  const [enabled, setEnabled] = useState(loaded.enabled)
  const [description, setDescription] = useState(loaded.description)
  const [numbers, setNumbers] = useState(() =>
    Object.fromEntries(fields.map((field) => [field, String((loaded.settings as DuelSettings)[field])])) as Record<keyof DuelSettings, string>,
  )
  const { busy, outcome, run } = useAction()

  const settings = Object.fromEntries(fields.map((field) => [field, Number(numbers[field])])) as DuelSettings
  const readable = fields.every((field) => wholeNumber.test(numbers[field].trim()))

  async function submit(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      await saveGameSettings({ game: loaded.id, enabled, description, settings })
      return text.admin.gameSaved
    })
  }

  return (
    <form className="panel" onSubmit={submit} noValidate data-game-settings>
      <h3>{gameName(loaded.id)}</h3>
      <label className="invitee">
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        <span className="tick" />
        {text.admin.gameOn}
      </label>
      <Field label={text.admin.gameDescription}>
        <textarea rows={4} value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      <div className="percentages">
        {fields.map((field) => (
          <Field key={field} label={text.admin.gamePercent[field]}>
            <input
              inputMode="numeric"
              value={numbers[field]}
              onChange={(event) => setNumbers({ ...numbers, [field]: event.target.value })}
              {...plainInput}
            />
          </Field>
        ))}
      </div>
      {/* REQ-148: worked out on every keystroke, from what's in the fields now. */}
      <div data-worked-example>
        <p className="hint">{text.admin.gameExample(formatMarcones(exampleBuyIn))}</p>
        {readable ? <Payoffs buyIn={exampleBuyIn} settings={settings} /> : <p className="hint">{text.admin.gameExampleUnreadable}</p>}
      </div>
      <Outcome outcome={outcome} />
      <button type="submit" className="secondary" disabled={busy}>
        {text.admin.saveGame}
      </button>
    </form>
  )
}

export function GameSettingsPanel() {
  const { state } = useLoad(fetchGames)

  return (
    <>
      <h2 className="section-title">{text.admin.games}</h2>
      {state.status === 'ready' ? state.data.map((game) => <DuelForm key={game.id} loaded={game} />) : <Pending state={state} />}
    </>
  )
}
