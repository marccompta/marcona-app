import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { text } from '../i18n/text'
import { pocketAt, pockets, pocketStep, stopRotation, type Colour } from '../lib/roulette'
import { prefersStillness } from '../shell/Balance'

export type WheelHandle = {
  /** Starts turning on the tap, before anyone knows the result. */
  start: () => void
  /** Settles on the server's result, and resolves once the wheel has stopped. */
  land: (result: Colour) => Promise<void>
  /** Coasts to a stop after a refused spin. */
  rest: () => void
}

const centre = 150
const pocketOuter = 126
const pocketInner = 96
const trackRadius = 137
const pocketBallRadius = 111

const wheelSpeed = 0.6 // Degrees per millisecond.
const ballSpeed = 0.75
const rampMs = 450
const coastMs = 600
const minimumTravel = 560
const dropAt = 0.6 // How far through the stop the ball falls into a pocket.
const bounceFor = 0.14

const easeOut = (progress: number) => 1 - (1 - progress) ** 3

const point = (radius: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180
  return `${(centre + radius * Math.sin(radians)).toFixed(2)} ${(centre - radius * Math.cos(radians)).toFixed(2)}`
}

function pocketPath(index: number) {
  const [left, right] = [(index - 0.5) * pocketStep, (index + 0.5) * pocketStep]
  return [
    `M${point(pocketOuter, left)}`,
    `A${pocketOuter} ${pocketOuter} 0 0 1 ${point(pocketOuter, right)}`,
    `L${point(pocketInner, right)}`,
    `A${pocketInner} ${pocketInner} 0 0 0 ${point(pocketInner, left)}Z`,
  ].join('')
}

const spokes = Array.from({ length: 8 }, (_, index) => index * 45)

// Drawn once. Only the disc's CSS rotation changes, which a phone can do cheaply.
function Disc({ ref }: { ref: Ref<SVGSVGElement> }) {
  return (
    <svg ref={ref} className="wheel-disc" viewBox="0 0 300 300" aria-hidden="true">
      <defs>
        <radialGradient id="wheel-cone">
          <stop offset="0.3" style={{ stopColor: 'var(--felt-500)' }} />
          <stop offset="1" style={{ stopColor: 'var(--felt-950)' }} />
        </radialGradient>
      </defs>
      <circle className="wheel-rim" cx={centre} cy={centre} r="147" />
      <circle className="wheel-track" cx={centre} cy={centre} r="142" />
      {pockets.map((colour, index) => (
        <path key={index} className={`pocket pocket--${colour}`} d={pocketPath(index)} />
      ))}
      <circle cx={centre} cy={centre} r={pocketInner} fill="url(#wheel-cone)" />
      <circle className="wheel-ring" cx={centre} cy={centre} r={pocketInner} />
      {spokes.map((degrees) => (
        <path key={degrees} className="wheel-spoke" d={`M${point(30, degrees)}L${point(84, degrees)}`} />
      ))}
      <circle className="wheel-hub" cx={centre} cy={centre} r="30" />
      <path className="wheel-hub-mark" d={`M${point(17, 0)}L${point(11, 90)}L${point(17, 180)}L${point(11, 270)}Z`} />
    </svg>
  )
}

// REQ-112: every stopping point comes from land(), which only gets the server's
// result. REQ-113: the ball circles against the wheel, drops and rides a pocket.
export function Wheel({ ref }: { ref: Ref<WheelHandle> }) {
  const root = useRef<HTMLDivElement>(null)
  const disc = useRef<SVGSVGElement>(null)
  const ball = useRef<SVGCircleElement>(null)
  const frame = useRef(0)
  const motion = useRef({ rotation: 0, orbit: 0, radius: pocketBallRadius, speed: 0 })
  const landing = useRef<{ result: Colour; done: () => void } | null>(null)

  function paint() {
    const { rotation, orbit, radius } = motion.current
    disc.current!.style.transform = `rotate(${rotation}deg)`
    ball.current!.setAttribute('transform', `rotate(${orbit} ${centre} ${centre}) translate(0 ${-radius})`)
  }

  function settled(stop: number) {
    Object.assign(motion.current, { rotation: stop, orbit: 0, radius: pocketBallRadius, speed: 0 })
    paint()
    root.current!.dataset.wheel = 'landed'
    root.current!.dataset.landed = pocketAt(stop)
    landing.current = null
  }

  function settle(result: Colour, done: () => void, began: number) {
    const state = motion.current
    const from = state.rotation
    const stop = stopRotation(result, from, minimumTravel, Math.random())
    const travel = stop - from
    // An ease-out curve starts at three times its average speed, so this length
    // of time carries on at the speed the wheel is already turning.
    const duration = (3 * travel) / wheelSpeed
    const wheelAt = (progress: number) => from + travel * easeOut(progress)

    // The ball slows to a halt exactly over the pocket it's about to fall into.
    const orbitFrom = state.orbit
    const fallOver = wheelAt(dropAt) - stop
    const naturalTravel = (ballSpeed * dropAt * duration) / 2
    // The nearest way to line up, so its speed barely changes as this begins.
    const extra = ((((orbitFrom - naturalTravel - fallOver + 180) % 360) + 360) % 360) - 180
    const orbitTravel = naturalTravel + extra

    const tick = (now: number) => {
      const progress = Math.min((now - began) / duration, 1)
      state.rotation = wheelAt(progress)

      if (progress < dropAt) {
        const part = progress / dropAt
        state.orbit = orbitFrom - orbitTravel * (1 - (1 - part) ** 2)
        state.radius = trackRadius
      } else {
        state.orbit = state.rotation - stop
        const fall = Math.min((progress - dropAt) / bounceFor, 1)
        const bounce = Math.abs(Math.sin(fall * Math.PI * 2.5)) * (1 - fall) * 9
        state.radius = trackRadius + (pocketBallRadius - trackRadius) * fall ** 0.6 + bounce
      }

      paint()
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick)
      } else {
        settled(stop)
        done()
      }
    }
    frame.current = requestAnimationFrame(tick)
  }

  function cruise() {
    const state = motion.current
    const began = performance.now()
    const startRadius = state.radius
    let previous = began

    const tick = (now: number) => {
      const ramp = Math.min((now - began) / rampMs, 1)
      const elapsed = now - previous
      previous = now
      state.speed = wheelSpeed * ramp
      state.rotation += state.speed * elapsed
      state.orbit -= ballSpeed * ramp * elapsed
      state.radius = startRadius + (trackRadius - startRadius) * ramp
      paint()

      // Never settles before full speed, so the stop always starts smoothly.
      if (landing.current && ramp === 1) {
        root.current!.dataset.wheel = 'settling'
        settle(landing.current.result, landing.current.done, now)
      } else {
        frame.current = requestAnimationFrame(tick)
      }
    }
    frame.current = requestAnimationFrame(tick)
  }

  useImperativeHandle(ref, () => ({
    start() {
      if (prefersStillness()) return
      cancelAnimationFrame(frame.current)
      root.current!.dataset.wheel = 'spinning'
      delete root.current!.dataset.landed
      cruise()
    },

    land(result) {
      // REQ-114: straight to the result, with no turning at all.
      if (prefersStillness()) {
        const stop = stopRotation(result, motion.current.rotation, 0, Math.random())
        settled(stop)
        return Promise.resolve()
      }
      return new Promise((done) => {
        landing.current = { result, done }
      })
    },

    rest() {
      if (prefersStillness()) return
      cancelAnimationFrame(frame.current)
      const state = motion.current
      const from = state.rotation
      const travel = (state.speed * coastMs) / 3
      const began = performance.now()

      const tick = (now: number) => {
        const progress = Math.min((now - began) / coastMs, 1)
        state.rotation = from + travel * easeOut(progress)
        paint()
        if (progress < 1) frame.current = requestAnimationFrame(tick)
      }
      frame.current = requestAnimationFrame(tick)
      root.current!.dataset.wheel = 'idle'
    },
  }))

  useEffect(() => {
    paint()
    return () => cancelAnimationFrame(frame.current)
  }, [])

  return (
    <div ref={root} className="wheel" role="img" aria-label={text.roulette.wheel} data-wheel="idle">
      <Disc ref={disc} />
      <svg className="wheel-top" viewBox="0 0 300 300" aria-hidden="true">
        <circle ref={ball} className="wheel-ball" cx={centre} cy={centre} r="6" />
        <path className="wheel-pointer" d="M150 26l-9-17h18z" />
      </svg>
    </div>
  )
}
