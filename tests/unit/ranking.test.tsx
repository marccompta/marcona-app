import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { text } from '../../src/i18n/text'
import { fetchPeople, rankPeople, type Person } from '../../src/lib/data'
import { Ranking } from '../../src/screens/Ranking'

vi.mock('../../src/lib/data', async (original) => ({
  ...(await original<typeof import('../../src/lib/data')>()),
  fetchPeople: vi.fn(),
}))

const person = (username: string, balance: number, removed = false): Person => ({
  user_id: username,
  username,
  balance,
  removed_at: removed ? '2026-11-06T00:00:00Z' : null,
})

const show = (people: Person[]) => {
  vi.mocked(fetchPeople).mockResolvedValue(people)
  render(
    <MemoryRouter>
      <Ranking me="marc" />
    </MemoryRouter>,
  )
}

describe('ranking', () => {
  it('REQ-011: shows the Catalan empty state while nobody else is there', async () => {
    show([person('marc', 0)])
    expect(await screen.findByRole('heading', { level: 2, name: text.ranking.emptyTitle })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: text.ranking.title })).toBeTruthy()
    expect(screen.getByText(text.ranking.emptyBody)).toBeTruthy()
  })

  it('REQ-011: leaves the empty state once a second user exists', async () => {
    show([person('marc', 0), person('anna', 0)])
    expect(await screen.findByText('anna')).toBeTruthy()
    expect(screen.queryByText(text.ranking.emptyTitle)).toBeNull()
  })

  it('REQ-019: shows a Catalan error if the load fails', async () => {
    vi.mocked(fetchPeople).mockRejectedValue({ code: 'XX000', message: 'Broken' })
    render(
      <MemoryRouter>
        <Ranking me="marc" />
      </MemoryRouter>,
    )
    expect((await screen.findByRole('alert')).textContent).toBe(text.errors.unknown)
  })
})

describe('rankPeople', () => {
  it('REQ-063: lists balances highest first', () => {
    expect(rankPeople([person('a', 1), person('b', 3), person('c', 2)]).map((p) => p.username)).toEqual(['b', 'c', 'a'])
  })

  it('REQ-064: orders equal balances alphabetically', () => {
    expect(rankPeople([person('zoe', 50), person('bea', 20), person('anna', 20)]).map((p) => p.username)).toEqual([
      'zoe',
      'anna',
      'bea',
    ])
  })

  it('REQ-050: leaves out removed users', () => {
    expect(rankPeople([person('anna', 1), person('gone', 99, true)]).map((p) => p.username)).toEqual(['anna'])
  })
})
