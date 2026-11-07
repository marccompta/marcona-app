import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { formatCount, formatSigned } from '../i18n/format'
import { text } from '../i18n/text'
import { prefersStillness } from '../shell/Balance'

const amountMs = 1300
const confettiMs = 1900
const pieces = 110
const gravity = 0.0011 // Pixels per millisecond, per millisecond.
const drag = 0.9985 // What's left of a piece's speed after a millisecond.

type Shape = 'chip' | 'diamond' | 'strip'

type Piece = {
  x: number
  y: number
  speedX: number
  speedY: number
  turn: number
  spin: number
  size: number
  colour: string
  shape: Shape
}

const shapes: Shape[] = ['chip', 'diamond', 'strip', 'strip']

function launch(x: number, y: number, colours: string[]): Piece[] {
  return Array.from({ length: pieces }, (_, index) => {
    // Mostly upwards, so the pieces rise past the wheel and rain back through it.
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5
    const speed = 0.35 + Math.random() * 0.95
    return {
      x,
      y,
      speedX: Math.cos(angle) * speed,
      speedY: Math.sin(angle) * speed,
      turn: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.02,
      size: 5 + Math.random() * 6,
      colour: colours[index % colours.length],
      shape: shapes[index % shapes.length],
    }
  })
}

function drawPiece(context: CanvasRenderingContext2D, { x, y, turn, size, colour, shape }: Piece) {
  context.save()
  context.translate(x, y)
  context.rotate(turn)
  context.fillStyle = colour
  if (shape === 'chip') {
    context.beginPath()
    // Flattens as it turns, like a chip tumbling through the air.
    context.ellipse(0, 0, size * 0.7, size * 0.7 * Math.abs(Math.cos(turn * 2)) + 1, 0, 0, Math.PI * 2)
    context.fill()
  } else if (shape === 'diamond') {
    context.beginPath()
    context.moveTo(0, -size * 0.8)
    context.lineTo(size * 0.55, 0)
    context.lineTo(0, size * 0.8)
    context.lineTo(-size * 0.55, 0)
    context.closePath()
    context.fill()
  } else {
    context.fillRect(-size * 0.3, -size * 0.8, size * 0.6, size * 1.6)
  }
  context.restore()
}

// Runs until the time is up, and returns how to stop it early.
function runConfetti(canvas: HTMLCanvasElement, x: number, y: number, done: () => void) {
  const context = canvas.getContext('2d')!
  const scale = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = window.innerWidth * scale
  canvas.height = window.innerHeight * scale
  context.scale(scale, scale)

  const tokens = getComputedStyle(document.documentElement)
  const colours = ['--gold', '--gold-light', '--ivory', '--pocket-red'].map((name) => tokens.getPropertyValue(name).trim())
  const all = launch(x, y, colours)
  const began = performance.now()
  let previous = began
  let frame = 0

  const tick = (now: number) => {
    const elapsed = now - previous
    previous = now
    const progress = (now - began) / confettiMs
    if (progress >= 1) {
      done()
      return
    }

    context.clearRect(0, 0, window.innerWidth, window.innerHeight)
    context.globalAlpha = Math.min(1, (1 - progress) * 3)
    const slowed = drag ** elapsed
    for (const piece of all) {
      piece.speedX *= slowed
      piece.speedY = piece.speedY * slowed + gravity * elapsed
      piece.x += piece.speedX * elapsed
      piece.y += piece.speedY * elapsed
      piece.turn += piece.spin * elapsed
      drawPiece(context, piece)
    }
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frame)
}

// REQ-113: the moment of a win. It's shown only once the wheel has stopped, and
// nothing here takes a tap. REQ-114: reduced motion keeps the amount, still, and
// drops the confetti.
export function WinBurst({ delta }: { delta: number }) {
  const anchor = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [showAmount, setShowAmount] = useState(true)
  const [falling, setFalling] = useState(() => !prefersStillness())

  useEffect(() => {
    const timer = setTimeout(() => setShowAmount(false), amountMs)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!canvas.current) return
    const box = anchor.current!.getBoundingClientRect()
    return runConfetti(canvas.current, box.left + box.width / 2, box.top + box.height / 2, () => setFalling(false))
    // It runs once, when this win appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const amount = formatSigned(delta)
  const unit = formatCount(delta, text.units.marcones).split(' ').at(-1)

  return (
    <div ref={anchor} className="win-burst" aria-hidden="true">
      {showAmount && (
        <p className="win-amount" data-win-amount style={{ '--characters': amount.length } as CSSProperties}>
          <strong>{amount}</strong>
          <span>{unit}</span>
        </p>
      )}
      {falling && createPortal(<canvas ref={canvas} className="confetti" data-confetti />, document.body)}
    </div>
  )
}
