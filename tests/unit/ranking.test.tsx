import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { text } from '../../src/i18n/text'
import { Ranking } from '../../src/screens/Ranking'

describe('ranking', () => {
  it('REQ-011: shows the Catalan empty state', () => {
    render(<Ranking />)
    expect(screen.getByRole('heading', { level: 1, name: text.ranking.title })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: text.ranking.emptyTitle })).toBeTruthy()
    expect(screen.getByText(text.ranking.emptyBody)).toBeTruthy()
  })
})
