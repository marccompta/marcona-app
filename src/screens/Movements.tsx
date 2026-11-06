import { formatDate, formatMarcones, formatSigned } from '../i18n/format'
import { text } from '../i18n/text'
import type { Loaded, Movement } from '../lib/data'

export const movementLabel = (movement: Movement) =>
  movement.concept ?? text.movements.kinds[movement.kind as keyof typeof text.movements.kinds] ?? movement.kind

// REQ-069: who, the amount, the concept or event, the balance after and the time.
export function Movements({ movements, showWho = true }: { movements: Movement[]; showWho?: boolean }) {
  if (movements.length === 0) return <p className="quiet">{text.movements.empty}</p>

  return (
    <ol className="movements">
      {movements.map((movement) => (
        <li key={movement.id} className="movement" data-movement>
          <div className="movement-main">
            {showWho && <strong className="movement-who">{movement.who.username}</strong>}
            <span className="movement-label">{movementLabel(movement)}</span>
            <time className="movement-time" dateTime={movement.created_at}>
              {formatDate(new Date(movement.created_at))}
            </time>
          </div>
          <div className="movement-money">
            <span className={movement.delta > 0 ? 'delta delta--up' : 'delta delta--down'}>
              {formatSigned(movement.delta)}
            </span>
            <span className="movement-after">
              {text.movements.balanceAfter} {formatMarcones(movement.balance_after)}
            </span>
          </div>
        </li>
      ))}
    </ol>
  )
}

// What a screen shows until its data is ready.
export function Pending({ state }: { state: Exclude<Loaded<unknown>, { status: 'ready' }> }) {
  if (state.status === 'failed') {
    return (
      <p className="notice" role="alert">
        {state.message}
      </p>
    )
  }
  return <p className="quiet">{text.app.loading}</p>
}
