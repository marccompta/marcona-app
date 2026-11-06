import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { text } from '../../src/i18n/text'
import { TabBar } from '../../src/shell/TabBar'

const renderTabs = (role: 'admin' | 'player') => {
  render(
    <MemoryRouter initialEntries={['/classificacio']}>
      <TabBar role={role} />
    </MemoryRouter>,
  )
  return within(screen.getByRole('navigation', { name: text.tabs.label }))
}

describe('tab bar', () => {
  it('REQ-012: gives a player the four shared tabs', () => {
    const labels = renderTabs('player').getAllByRole('link').map((link) => link.textContent)
    expect(labels).toEqual([text.tabs.ranking, text.tabs.events, text.tabs.roulette, text.tabs.audit])
  })

  it('REQ-013: shows Administració to the admin', () => {
    expect(renderTabs('admin').getByRole('link', { name: text.tabs.admin })).toBeTruthy()
  })

  it('REQ-013: hides Administració from a player', () => {
    expect(renderTabs('player').queryByRole('link', { name: text.tabs.admin })).toBeNull()
  })

  it('REQ-012: marks the current screen', () => {
    const current = renderTabs('player').getByRole('link', { name: text.tabs.ranking })
    expect(current.getAttribute('aria-current')).toBe('page')
  })
})
