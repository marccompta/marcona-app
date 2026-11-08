import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Movement } from '../../src/lib/data'

// Each row formats its time once per render, so counting the calls counts the rows rendered.
const formatted = vi.hoisted(() => ({ count: 0 }))
vi.mock('../../src/i18n/format', async (original) => {
  const real = await original<typeof import('../../src/i18n/format')>()
  return {
    ...real,
    formatMoment: (value: Date) => {
      formatted.count += 1
      return real.formatMoment(value)
    },
  }
})

const { Movements } = await import('../../src/screens/Movements')

const movement = (id: number, withEvent = true): Movement => ({
  id,
  user_id: 'u1',
  delta: 5,
  balance_after: 100 + id,
  kind: withEvent ? 'event_payout' : 'admin_adjustment',
  concept: withEvent ? null : 'Prova',
  details: {},
  created_at: '2026-11-08T10:00:00Z',
  who: { username: 'anna' },
  event: withEvent ? { id: `e${id}`, name: `Esdeveniment ${id}` } : null,
  actor: null,
})

// A fresh read returns new objects with the same content, as the API does.
const read = (ids: number[]) => ids.map((id) => movement(id, id % 2 === 0))

const screen = (movements: Movement[]) => (
  <MemoryRouter>
    <Movements movements={movements} />
  </MemoryRouter>
)

describe('the movement list', () => {
  beforeEach(() => {
    formatted.count = 0
  })

  it('REQ-216: a fresh read with one new movement renders only that row', () => {
    const older = Array.from({ length: 200 }, (_, index) => 200 - index)
    const view = render(screen(read(older)))
    expect(formatted.count).toBe(200)

    formatted.count = 0
    view.rerender(screen(read([201, ...older])))

    expect(formatted.count).toBe(1)
    expect(view.container.querySelectorAll('[data-movement]')).toHaveLength(201)
    expect(view.container.querySelector('[data-movement]')?.textContent).toContain('+5')
  })

  it('REQ-099: a movement on an event still opens it, and the others are not links', () => {
    const view = render(screen(read([2, 1])))
    const rows = view.container.querySelectorAll('[data-movement]')

    expect(rows[0].tagName).toBe('A')
    expect(rows[0].getAttribute('href')).toBe('/esdeveniments/e2')
    expect(rows[1].tagName).toBe('DIV')
  })

  it('REQ-069: whether to show who still changes the rows', () => {
    const view = render(screen(read([2, 1])))
    expect(view.container.querySelector('.movement-who')).not.toBeNull()

    view.rerender(
      <MemoryRouter>
        <Movements movements={read([2, 1])} showWho={false} />
      </MemoryRouter>,
    )
    expect(view.container.querySelector('.movement-who')).toBeNull()
  })
})
