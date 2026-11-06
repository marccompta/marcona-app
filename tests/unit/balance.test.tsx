import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChipStack, chipCount, CountUp } from '../../src/shell/Balance'

describe('chip stacks', () => {
  it('REQ-070: nothing to stack at 0, one chip for a little', () => {
    expect(chipCount(0)).toBe(0)
    expect(chipCount(1)).toBe(1)
  })

  it('REQ-070: never shrinks as the balance grows, and stops at a readable height', () => {
    const balances = [1, 50, 100, 300, 700, 1500, 3100, 6300, 12700, 1000000]
    const counts = balances.map(chipCount)
    expect(counts).toEqual([...counts].sort((a, b) => a - b))
    expect(Math.max(...counts)).toBe(8)
  })

  it('REQ-070: draws one chip per step, hidden from screen readers', () => {
    const { container } = render(<ChipStack balance={700} />)
    expect(container.querySelectorAll('.chip')).toHaveLength(chipCount(700))
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('REQ-070: a balance of 0 still shows an outline', () => {
    const { container } = render(<ChipStack balance={0} />)
    expect(container.querySelector('.chip-empty')).not.toBeNull()
  })
})

describe('count-up numbers', () => {
  it('REQ-070: ends on the balance, formatted', async () => {
    render(<CountUp value={1234} />)
    await waitFor(() => expect(screen.getByLabelText('1.234').textContent).toBe('1.234'), { timeout: 2000 })
  })

  it('REQ-070: gives screen readers the final value at once', () => {
    render(<CountUp value={1234} />)
    expect(screen.getByLabelText('1.234')).toBeTruthy()
  })
})
