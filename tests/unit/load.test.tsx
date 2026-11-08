import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLoad, type Loaded } from '../../src/lib/data'

// A load the test answers by hand, to control when each one finishes.
function heldLoads() {
  const calls: { answer: (value: string) => void; fail: (error: unknown) => void }[] = []
  const load = () => new Promise<string>((answer, fail) => calls.push({ answer, fail }))
  return { calls, load }
}

function Screen({ load, keyValue, seen }: { load: () => Promise<string>; keyValue?: string; seen: { state?: Loaded<string>; reload?: () => void } }) {
  const { state, reload } = useLoad(load, keyValue ?? null)
  seen.state = state
  seen.reload = reload
  return null
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve)))

describe('useLoad', () => {
  it('REQ-216: a reload while a load is running lets it finish and show, then reads once more', async () => {
    const { calls, load } = heldLoads()
    const seen: { state?: Loaded<string>; reload?: () => void } = {}
    render(<Screen load={load} seen={seen} />)
    expect(calls).toHaveLength(1)

    act(() => seen.reload!())
    expect(calls).toHaveLength(1)

    calls[0].answer('first')
    await settle()
    expect(seen.state).toEqual({ status: 'ready', data: 'first' })
    expect(calls).toHaveLength(2)

    calls[1].answer('second')
    await settle()
    expect(seen.state).toEqual({ status: 'ready', data: 'second' })
    expect(calls).toHaveLength(2)
  })

  it('REQ-216: many reloads during one load lead to a single read after it', async () => {
    const { calls, load } = heldLoads()
    const seen: { state?: Loaded<string>; reload?: () => void } = {}
    render(<Screen load={load} seen={seen} />)

    // Each in its own render, as live changes arrive one by one.
    for (let i = 0; i < 10; i++) act(() => seen.reload!())
    calls[0].answer('first')
    await settle()
    calls[1].answer('second')
    await settle()

    expect(calls).toHaveLength(2)
    expect(seen.state).toEqual({ status: 'ready', data: 'second' })
  })

  it('REQ-216: a reload with nothing running reads at once', async () => {
    const { calls, load } = heldLoads()
    const seen: { state?: Loaded<string>; reload?: () => void } = {}
    render(<Screen load={load} seen={seen} />)
    calls[0].answer('first')
    await settle()

    act(() => seen.reload!())
    expect(calls).toHaveLength(2)
  })

  it('a failed read shows the failure, and a reload can recover', async () => {
    const { calls, load } = heldLoads()
    const seen: { state?: Loaded<string>; reload?: () => void } = {}
    render(<Screen load={load} seen={seen} />)
    calls[0].fail(new TypeError('Failed to fetch'))
    await settle()
    expect(seen.state?.status).toBe('failed')

    act(() => seen.reload!())
    calls[1].answer('back')
    await settle()
    expect(seen.state).toEqual({ status: 'ready', data: 'back' })
  })

  it('a new key discards what the old one was still reading', async () => {
    const { calls, load } = heldLoads()
    const seen: { state?: Loaded<string>; reload?: () => void } = {}
    const view = render(<Screen load={load} keyValue="anna" seen={seen} />)
    view.rerender(<Screen load={load} keyValue="bea" seen={seen} />)
    expect(calls).toHaveLength(2)

    calls[1].answer('bea')
    await settle()
    calls[0].answer('anna')
    await settle()
    expect(seen.state).toEqual({ status: 'ready', data: 'bea' })
  })
})
