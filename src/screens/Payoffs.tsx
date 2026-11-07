import { formatMarcones } from '../i18n/format'
import { text } from '../i18n/text'
import { duelOutcomes, type DuelSettings } from '../lib/games'

// REQ-129, REQ-148: every payoff, worked out for one buy-in. The event screen and
// the admin's worked example both show this.
export function Payoffs({ buyIn, settings }: { buyIn: number; settings: DuelSettings }) {
  const amounts = duelOutcomes(buyIn, settings)
  const line = (words: (amount: string, percent: number) => string, amount: number, percent: number) =>
    words(formatMarcones(amount), percent)

  return (
    <dl className="payoffs">
      <div data-payoff>
        <dt>{text.games.bothTrust}</dt>
        <dd>{line(text.games.each, amounts.bothTrust, settings.both_trust)}</dd>
      </div>
      <div data-payoff>
        <dt>{text.games.oneBetrays}</dt>
        <dd>{line(text.games.betrayer, amounts.betrayer, settings.betrayer)}</dd>
        <dd>{line(text.games.betrayed, amounts.betrayed, settings.betrayed)}</dd>
      </div>
      <div data-payoff>
        <dt>{text.games.bothBetray}</dt>
        <dd>{line(text.games.each, amounts.bothBetray, settings.both_betray)}</dd>
      </div>
    </dl>
  )
}
