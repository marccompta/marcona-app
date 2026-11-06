import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const tokens = readFileSync('src/theme/tokens.css', 'utf8')
const app = readFileSync('src/theme/app.css', 'utf8')
const html = readFileSync('index.html', 'utf8')

const token = (name: string) => {
  const match = tokens.match(new RegExp(`--${name}: *(#[0-9a-f]{6})`))
  if (!match) throw new Error(`Missing token --${name}`)
  return match[1]
}

const channel = (hex: string, start: number) => {
  const value = parseInt(hex.slice(start, start + 2), 16) / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}
const luminance = (hex: string) => 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5)
const contrast = (a: string, b: string) => {
  const [dark, light] = [luminance(a), luminance(b)].sort((x, y) => x - y)
  return (light + 0.05) / (dark + 0.05)
}

describe('design tokens', () => {
  it('REQ-020: keeps the Casino Tokens colours', () => {
    expect(token('felt-900')).toBe('#073b2b')
    expect(token('felt-700')).toBe('#0d5439')
    expect(token('felt-500')).toBe('#116a49')
    expect(token('gold')).toBe('#f0c24b')
    expect(token('ivory')).toBe('#f6f1dc')
    expect(token('sage')).toBe('#9cc7b1')
  })

  it('REQ-020: uses a serif for headings and the soft radial glow', () => {
    expect(tokens).toMatch(/--font-display:[^;]*serif/)
    expect(app).toContain('radial-gradient')
  })

  it('REQ-021: has felt texture, gold foil and transitions', () => {
    expect(app).toContain('feTurbulence')
    expect(tokens).toContain('--gold-foil')
    expect(app).toContain('transition')
  })

  it('REQ-021: stills its motion for people who ask for that', () => {
    expect(app).toContain('prefers-reduced-motion')
  })

  it('REQ-026: keeps every text colour readable on the lightest background', () => {
    const lightest = token('felt-700')
    for (const name of ['ivory', 'gold', 'sage', 'danger']) {
      expect(contrast(token(name), lightest), name).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('fonts', () => {
  const sources = [...tokens.matchAll(/url\('([^']+)'\)\s*format/g)].map((match) => match[1])

  it('REQ-022: loads every font from the site itself', () => {
    expect(sources.length).toBeGreaterThan(0)
    for (const source of sources) {
      expect(source).toMatch(/^\/fonts\//)
      expect(existsSync(`public${source}`), source).toBe(true)
    }
  })

  it('REQ-022: never calls a font service', () => {
    for (const file of [tokens, app, html]) {
      expect(file).not.toMatch(/fonts\.(googleapis|gstatic)|use\.typekit|fonts\.bunny/)
    }
  })
})

describe('layout', () => {
  it('REQ-025: respects every safe area', () => {
    for (const side of ['top', 'bottom', 'left', 'right']) {
      expect(app).toContain(`env(safe-area-inset-${side})`)
    }
    expect(html).toContain('viewport-fit=cover')
  })

  it('REQ-024: sets the tap target size once and uses it', () => {
    expect(tokens).toContain('--tap: 44px')
    expect(app).toContain('var(--tap)')
  })

  it('REQ-027: stops the layout growing on a desktop', () => {
    expect(app).toMatch(/max-width:\s*var\(--column\)/)
  })
})
