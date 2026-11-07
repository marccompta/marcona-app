import { Link } from 'react-router'
import { formatMarcones, formatMoment, formatSigned } from '../i18n/format'
import { text } from '../i18n/text'
import type { Loaded, Movement } from '../lib/data'
import type { Colour } from '../lib/roulette'

// REQ-190: a buy-in is only ever made by someone else when it's forced.
export const forcedBy = ({ kind, actor, who }: Movement) =>
  kind === 'event_buy_in' && actor && actor.username !== who.username ? actor.username : null

// REQ-111: a spin shows what was chosen and what came up.
function spinLabel({ details }: Movement) {
  const { choice, result } = details as { choice: Colour; result: Colour }
  const { colours } = text.roulette
  return text.movements.spin(colours[choice].toLowerCase(), colours[result].toLowerCase())
}

export function movementLabel(movement: Movement) {
  if (movement.concept) return movement.concept
  if (movement.kind === 'roulette_spin') return spinLabel(movement)
  const kind = forcedBy(movement)
    ? text.movements.forced
    : (text.movements.kinds[movement.kind as keyof typeof text.movements.kinds] ?? movement.kind)
  return movement.event ? `${kind} · ${movement.event.name}` : kind
}

function MovementRow({ movement, showWho }: { movement: Movement; showWho: boolean }) {
  const by = forcedBy(movement)
  return (
    <>
      <div className="movement-main">
        {showWho && <strong className="movement-who">{movement.who.username}</strong>}
        <span className="movement-label">{movementLabel(movement)}</span>
        {by && <span className="movement-by">{text.movements.forcedBy(by)}</span>}
        <time className="movement-time" dateTime={movement.created_at}>
          {formatMoment(new Date(movement.created_at))}
        </time>
      </div>
      <div className="movement-money">
        <span className={movement.delta > 0 ? 'delta delta--up' : 'delta delta--down'}>{formatSigned(movement.delta)}</span>
        <span className="movement-after">
          {text.movements.balanceAfter} {formatMarcones(movement.balance_after)}
        </span>
      </div>
    </>
  )
}

// REQ-069: who, the amount, the concept or event, the balance after and the time.
// REQ-099: a movement on an event opens that event.
export function Movements({ movements, showWho = true }: { movements: Movement[]; showWho?: boolean }) {
  if (movements.length === 0) return <p className="quiet">{text.movements.empty}</p>

  return (
    <ol className="movements">
      {movements.map((movement) => (
        <li key={movement.id}>
          {movement.event ? (
            <Link to={`/esdeveniments/${movement.event.id}`} className="movement" data-movement>
              <MovementRow movement={movement} showWho={showWho} />
            </Link>
          ) : (
            <div className="movement" data-movement>
              <MovementRow movement={movement} showWho={showWho} />
            </div>
          )}
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
