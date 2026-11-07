import { useRef, useState } from 'react'
import { formatMarcones } from '../i18n/format'
import { text } from '../i18n/text'
import { useLoad } from '../lib/data'
import { fetchRoulette, spin, type Choice, type RouletteTable, type Spin } from '../lib/roulette'
import { ChipStack, CountUp } from '../shell/Balance'
import { Field, Outcome, plainInput, useAction } from '../shell/Form'
import { EmptyChip } from '../shell/icons'
import { Pending } from './Movements'
import { Wheel, type WheelHandle } from './Wheel'
import { WinBurst } from './WinBurst'

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
  const wheel = useRef<WheelHandle>(null)

  function edit<T>(setter: (value: T) => void, value: T) {
    requestId.current = null
    setter(value)
  }

  async function play() {
    requestId.current ??= crypto.randomUUID()
    const id = requestId.current
    setLast(null)
    wheel.current?.start()
    const done = await run(async () => {
      const outcome = await spin({ requestId: id, choice, bet: Number(bet) })
      // REQ-112: the balance and the result wait for the wheel to stop.
      await wheel.current?.land(outcome.result)
      setLast(outcome)
      return ''
    })
    if (done) requestId.current = null
    else wheel.current?.rest()
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

      <div className="wheel-stage">
        <Wheel ref={wheel} />
        {last?.won && <WinBurst delta={last.delta} />}
      </div>

      <div className="spin-line">
        <p role="status">{last && <Result spin={last} />}</p>
        {outcome?.kind === 'failed' && <Outcome outcome={outcome} />}
      </div>

      <form
        className="bet"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void play()
        }}
      >
        <div className="colours" role="group" aria-label={text.roulette.choice}>
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
        <div className="bet-row">
          <Field label={text.roulette.bet}>
            <input
              inputMode="numeric"
              value={bet}
              disabled={busy}
              onChange={(event) => edit(setBet, event.target.value)}
              {...plainInput}
            />
          </Field>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? text.roulette.spinning : text.roulette.spin}
          </button>
        </div>
        <p className="hint" data-max-bet>
          {text.roulette.maxBet(formatMarcones(table.max_bet))}
        </p>
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
