import { useState, type FormEvent, type ReactNode } from 'react'
import { formatMarcones } from '../i18n/format'
import { text } from '../i18n/text'
import { useLoad } from '../lib/data'
import {
  fetchGames,
  gameName,
  minoria,
  minoriaChoices,
  saveGameSettings,
  type DuelSettings,
  type Game,
  type MinoriaSettings,
} from '../lib/games'
import { Field, Outcome, plainInput, useAction } from '../shell/Form'
import { Pending } from './Movements'
import { Payoffs } from './Payoffs'

const exampleBuyIn = 10
const fields: (keyof DuelSettings)[] = ['both_trust', 'betrayer', 'betrayed', 'both_betray']
const labelFields = minoriaChoices.map((choice) => `option_${choice}` as keyof MinoriaSettings)

const wholeNumber = /^\d+$/

// REQ-146, REQ-147, REQ-160: what every game has. Applies to new events, and the
// server checks the values (REQ-144, REQ-160).
function GameForm({
  loaded,
  settings,
  children,
}: {
  loaded: Game
  settings: DuelSettings | MinoriaSettings
  children: ReactNode
}) {
  const [enabled, setEnabled] = useState(loaded.enabled)
  const [description, setDescription] = useState(loaded.description)
  const { busy, outcome, run } = useAction()

  async function submit(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      await saveGameSettings({ game: loaded.id, enabled, description, settings })
      return text.admin.gameSaved
    })
  }

  return (
    <form className="panel" onSubmit={submit} noValidate data-game-settings={loaded.id}>
      <h3>{gameName(loaded.id)}</h3>
      <label className="invitee">
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        <span className="tick" />
        {text.admin.gameOn}
      </label>
      <Field label={text.admin.gameDescription}>
        <textarea rows={4} value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      {children}
      <Outcome outcome={outcome} />
      <button type="submit" className="secondary" disabled={busy}>
        {text.admin.saveGame}
      </button>
    </form>
  )
}

function DuelForm({ loaded }: { loaded: Game }) {
  const [numbers, setNumbers] = useState(() =>
    Object.fromEntries(fields.map((field) => [field, String((loaded.settings as DuelSettings)[field])])) as Record<keyof DuelSettings, string>,
  )

  const settings = Object.fromEntries(fields.map((field) => [field, Number(numbers[field])])) as DuelSettings
  const readable = fields.every((field) => wholeNumber.test(numbers[field].trim()))

  return (
    <GameForm loaded={loaded} settings={settings}>
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
    </GameForm>
  )
}

// REQ-160: the option labels. A choice is stored by its key, so a rename never
// touches one, and running events keep the labels they were created with.
function MinoriaForm({ loaded }: { loaded: Game }) {
  const [labels, setLabels] = useState(loaded.settings as MinoriaSettings)

  return (
    <GameForm loaded={loaded} settings={labels}>
      {labelFields.map((field) => (
        <Field key={field} label={text.admin.gameOption[field]}>
          <input
            value={labels[field]}
            maxLength={20}
            onChange={(event) => setLabels({ ...labels, [field]: event.target.value })}
            {...plainInput}
          />
        </Field>
      ))}
      <p className="hint">{text.admin.gameOptionsHelp}</p>
    </GameForm>
  )
}

export function GameSettingsPanel() {
  const { state } = useLoad(fetchGames)

  return (
    <>
      <h2 className="section-title">{text.admin.games}</h2>
      {state.status === 'ready' ? (
        state.data.map((game) =>
          game.id === minoria ? <MinoriaForm key={game.id} loaded={game} /> : <DuelForm key={game.id} loaded={game} />,
        )
      ) : (
        <Pending state={state} />
      )}
    </>
  )
}
