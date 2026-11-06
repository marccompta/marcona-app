import { useEffect, useRef, useState } from 'react'
import { formatNumber } from '../i18n/format'

const maxChips = 8
const chipHeight = 8
const chipStep = 5
const countUpMs = 700

// Each extra chip takes about twice as many marcones, so stacks stay readable
// from a handful of marcones up to many thousands.
export const chipCount = (balance: number) =>
  balance <= 0 ? 0 : Math.min(maxChips, 1 + Math.floor(Math.log2(1 + balance / 100)))

export function ChipStack({ balance, large = false }: { balance: number; large?: boolean }) {
  const count = chipCount(balance)
  const height = chipHeight + chipStep * Math.max(count - 1, 0) + 2
  const scale = large ? 2 : 1

  return (
    <svg
      className="chips"
      data-chips={count}
      viewBox={`0 0 34 ${height}`}
      width={34 * scale}
      height={height * scale}
      aria-hidden="true"
    >
      {count === 0 && <ellipse className="chip-empty" cx="17" cy={height / 2} rx="15" ry="4" />}
      {Array.from({ length: count }, (_, index) => {
        const y = height - 6 - index * chipStep
        return (
          <g key={index} className="chip" style={{ animationDelay: `${index * 45}ms` }}>
            <path className="chip-edge" d={`M2 ${y - 1}v2c0 2.2 6.700 4 15 4s15-1.800 15-4v-2z`} />
            <ellipse className="chip-face" cx="17" cy={y - 1} rx="15" ry="4" />
            <ellipse className="chip-spots" cx="17" cy={y - 1} rx="12.500" ry="3" />
          </g>
        )
      })}
    </svg>
  )
}

const prefersStillness = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// REQ-070: counts from the last value shown. Screen readers get the final value.
export function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    if (prefersStillness()) {
      from.current = value
      setShown(value)
      return
    }

    const start = from.current
    let began: number | undefined
    let frame = requestAnimationFrame(function tick(now) {
      began ??= now
      const progress = Math.min((now - began) / countUpMs, 1)
      const eased = 1 - (1 - progress) ** 3
      setShown(Math.round(start + (value - start) * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
      else from.current = value
    })
    return () => cancelAnimationFrame(frame)
  }, [value])

  return (
    <span className="count" aria-label={formatNumber(value)} data-value={value}>
      {formatNumber(shown)}
    </span>
  )
}
