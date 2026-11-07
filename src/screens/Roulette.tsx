import { useRef, useState } from 'react'
import { formatMarcones } from '../i18n/format'
import { text } from '../i18n/text'
import { useLoad } from '../lib/data'
import { fetchRoulette, spin, type Choice, type RouletteTable, type Spin } from '../lib/roulette'
import { ChipStack, CountUp } from '../shell/Balance'
import { Field, Outcome, plainInput, useAction } from '../shell/Form'
import { EmptyChip } from '../shell/icons'
import { Pending } from './Movements'

const choices: Choice[] = ['red', 'black']

function Closed() {
  return (
    <div className="empty">
      <EmptyChip />
      <h2>{text.roulette.closedTitle}</h2>
      <p>{text.roulette.closedBody}</p>
    </div>
  )
}

function Result({ spin: { result, won, bet } }: { spin: Spin }) {
  const amount = formatMarcones(bet)
  return (
    <span className="spin-result" data-result={result}>
      <strong>{text.roulette.colours[result]}</strong>
      {won ? text.roulette.won(amount) : text.roulette.lost(amount)}
    </span>
  )
}

function Table({ loaded }: { loaded: RouletteTable }) {
  const [table, setTable] = useState(loaded)
  const [choice, setChoice] = useState<Choice>('red')
  const [bet, setBet] = useState('1')
  const [last, setLast] = useState<Spin | null>(null)
  const { busy, outcome, run } = useAction()
  // A retry of the same attempt keeps its ID, so a lost reply can't spin twice.
  const requestId = useRef<string | null>(null)

  function edit<T>(setter: (value: T) => void, value: T) {
    requestId.current = null
    setter(value)
  }

  async function play() {
    requestId.current ??= crypto.randomUUID()
    const id = requestId.current
    setLast(null)
    const done = await run(async () => {
      setLast(await spin({ requestId: id, choice, bet: Number(bet) }))
      return ''
    })
    if (done) requestId.current = null
    // Quietly, so a failed read doesn't take the table away mid-retry.
    fetchRoulette().then(setTable, () => undefined)
  }

  if (!table.enabled) return <Closed />

  return (
    <>
      <div className="table-balance" data-balance>
        <span>{text.roulette.balance}</span>
        <ChipStack balance={table.balance} />
        <strong>
          <CountUp value={table.balance} />
        </strong>
      </div>

      <p className="spin-line" role="status">
        {last && <Result spin={last} />}
      </p>
      {outcome?.kind === 'failed' && <Outcome outcome={outcome} />}

      <form
        className="bet"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void play()
        }}
      >
        <fieldset className="group">
          <legend>{text.roulette.choice}</legend>
          <div className="colours">
            {choices.map((colour) => (
              <button
                key={colour}
                type="button"
                className={`colour colour--${colour}`}
                aria-pressed={choice === colour}
                disabled={busy}
                onClick={() => edit(setChoice, colour)}
              >
                {text.roulette.colours[colour]}
              </button>
            ))}
          </div>
        </fieldset>
        <Field label={text.roulette.bet}>
          <input
            inputMode="numeric"
            value={bet}
            disabled={busy}
            onChange={(event) => edit(setBet, event.target.value)}
            {...plainInput}
          />
        </Field>
        <p className="hint" data-max-bet>
          {text.roulette.maxBet(formatMarcones(table.max_bet))}
        </p>
        <button type="submit" className="primary" disabled={busy}>
          {busy ? text.roulette.spinning : text.roulette.spin}
        </button>
      </form>
    </>
  )
}

export function Roulette() {
  const { state } = useLoad(fetchRoulette)

  return (
    <section className="screen" data-screen="ruleta">
      <h1 className="screen-title">{text.roulette.title}</h1>
      {state.status === 'ready' ? <Table loaded={state.data} /> : <Pending state={state} />}
    </section>
  )
}
