import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { settleMs, useLive, type LiveClient, type LiveSource } from '../../src/lib/live'

// A stand-in for the Supabase client's Realtime channels.
function fakeClient() {
  const channels: {
    bindings: { filter: Record<string, string>; callback: (payload: unknown) => void }[]
    status: (status: string) => void
    removed: boolean
  }[] = []
  const options: unknown[] = []
  const client = {
    channel(_name: string, settings: unknown) {
      options.push(settings)
      const channel = {
        bindings: [] as (typeof channels)[number]['bindings'],
        status: (_status: string) => {},
        removed: false,
        on(_type: string, filter: Record<string, string>, callback: (payload: unknown) => void) {
          channel.bindings.push({ filter, callback })
          return channel
        },
        subscribe(callback: (status: string) => void) {
          channel.status = callback
          return channel
        },
      }
      channels.push(channel)
      return channel
    },
    removeChannel(channel: (typeof channels)[number]) {
      channel.removed = true
      return Promise.resolve('ok')
    },
  }
  const change = (table: string) =>
    channels
      .filter((channel) => !channel.removed)
      .flatMap((channel) => channel.bindings)
      .filter((binding) => binding.filter.table === table)
      .forEach((binding) => binding.callback({ table, new: {}, old: {} }))
  return { client: client as unknown as LiveClient, channels, change, options }
}

function Screen(props: { sources: LiveSource[]; refresh: () => void; client: LiveClient; enabled?: boolean }) {
  useLive(props.sources, props.refresh, { client: props.client, enabled: props.enabled })
  return null
}

const settle = () => act(() => vi.advanceTimersByTime(settleMs))

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('live refresh', () => {
  it('REQ-150, REQ-151: watches every table the screen asks for, in the public schema', () => {
    const { client, channels } = fakeClient()
    render(<Screen sources={[{ table: 'profiles' }, { table: 'ledger' }]} refresh={() => {}} client={client} />)
    expect(channels).toHaveLength(1)
    expect(channels[0].bindings.map((binding) => binding.filter)).toEqual([
      { event: '*', schema: 'public', table: 'profiles' },
      { event: '*', schema: 'public', table: 'ledger' },
    ])
  })

  it('REQ-150: waits for the database side, so the read on subscribing misses nothing', () => {
    const { client, options } = fakeClient()
    render(<Screen sources={[{ table: 'profiles' }]} refresh={() => {}} client={client} />)
    expect(options).toEqual([{ config: { postgres_changes_options: { wait: true } } }])
  })

  it('REQ-152: passes a filter on to Realtime', () => {
    const { client, channels } = fakeClient()
    render(<Screen sources={[{ table: 'events', filter: 'id=eq.e1' }]} refresh={() => {}} client={client} />)
    expect(channels[0].bindings[0].filter).toEqual({ event: '*', schema: 'public', table: 'events', filter: 'id=eq.e1' })
  })

  it('REQ-150: reads again once after a burst of changes', () => {
    const { client, change } = fakeClient()
    const refresh = vi.fn()
    render(<Screen sources={[{ table: 'profiles' }, { table: 'ledger' }]} refresh={refresh} client={client} />)

    change('ledger')
    change('profiles')
    change('ledger')
    expect(refresh).not.toHaveBeenCalled()
    settle()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('REQ-150: reads again each time the subscription is made, so a reconnect catches up', () => {
    const { client, channels } = fakeClient()
    const refresh = vi.fn()
    render(<Screen sources={[{ table: 'profiles' }]} refresh={refresh} client={client} />)

    act(() => channels[0].status('SUBSCRIBED'))
    settle()
    act(() => channels[0].status('CHANNEL_ERROR'))
    settle()
    expect(refresh).toHaveBeenCalledTimes(1)
    act(() => channels[0].status('SUBSCRIBED'))
    settle()
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('REQ-150: reads again when the phone wakes or comes back online', () => {
    const { client } = fakeClient()
    const refresh = vi.fn()
    render(<Screen sources={[{ table: 'profiles' }]} refresh={refresh} client={client} />)

    const visibility = vi.spyOn(document, 'visibilityState', 'get')
    visibility.mockReturnValue('hidden')
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    settle()
    expect(refresh).not.toHaveBeenCalled()

    visibility.mockReturnValue('visible')
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    settle()
    expect(refresh).toHaveBeenCalledTimes(1)

    act(() => void window.dispatchEvent(new Event('online')))
    settle()
    expect(refresh).toHaveBeenCalledTimes(2)
    visibility.mockRestore()
  })

  it('REQ-150: leaves the channel and stops listening when the screen closes', () => {
    const { client, channels, change } = fakeClient()
    const refresh = vi.fn()
    const view = render(<Screen sources={[{ table: 'profiles' }]} refresh={refresh} client={client} />)

    change('profiles')
    view.unmount()
    settle()
    expect(channels[0].removed).toBe(true)
    act(() => void window.dispatchEvent(new Event('online')))
    settle()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('REQ-152: subscribes to nothing while turned off', () => {
    const { client, channels } = fakeClient()
    render(<Screen sources={[{ table: 'events' }]} refresh={() => {}} client={client} enabled={false} />)
    expect(channels).toHaveLength(0)
  })

  it('REQ-150: uses the newest refresh without subscribing again', () => {
    const { client, channels, change } = fakeClient()
    const first = vi.fn()
    const second = vi.fn()
    const view = render(<Screen sources={[{ table: 'profiles' }]} refresh={first} client={client} />)
    view.rerender(<Screen sources={[{ table: 'profiles' }]} refresh={second} client={client} />)

    change('profiles')
    settle()
    expect(channels).toHaveLength(1)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
