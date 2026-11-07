import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

/** The tables in the Realtime publication. `private.choices` is never one of them. */
export type LiveTable = 'profiles' | 'ledger' | 'events' | 'event_participants'

/** A table to watch, optionally narrowed with a Realtime filter such as `id=eq.<uuid>`. */
export type LiveSource = { table: LiveTable; filter?: string }

export type LiveClient = Pick<typeof supabase, 'channel' | 'removeChannel'>

export type Change = { table: string; record: Record<string, unknown>; old: Record<string, unknown> }

let channels = 0

// REQ-150 to REQ-152: tells onChange whenever a watched table changes, and
// onReady each time the subscription is (re)established. A message only says
// that something changed: callers read the data again through the normal reads,
// so Row Level Security decides what they see, and its content is never trusted.
export function watchTables(
  sources: LiveSource[],
  onChange: (change: Change) => void,
  { client = supabase as LiveClient, onReady = () => {} }: { client?: LiveClient; onReady?: () => void } = {},
) {
  channels += 1
  const channel = client.channel(`live-${channels}`)
  for (const { table, filter } of sources) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
      (payload: { table: string; new: Record<string, unknown>; old: Record<string, unknown> }) =>
        onChange({ table: payload.table, record: payload.new ?? {}, old: payload.old ?? {} }),
    )
  }
  channel.subscribe((status: string) => {
    if (status === 'SUBSCRIBED') onReady()
  })
  return () => void client.removeChannel(channel)
}

/** How long a burst of changes, such as an event paying out, waits before one read. */
export const settleMs = 150

// Reads a screen's data again when a watched table changes, when the
// subscription is (re)established, when the phone wakes, and when the browser
// comes back online. A burst of changes leads to a single read.
export function useLive(
  sources: LiveSource[],
  refresh: () => void,
  { enabled = true, client }: { enabled?: boolean; client?: LiveClient } = {},
) {
  const latest = useRef(refresh)
  latest.current = refresh
  const key = enabled ? JSON.stringify(sources) : null

  useEffect(() => {
    if (key === null) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const soon = () => {
      clearTimeout(timer)
      timer = setTimeout(() => latest.current(), settleMs)
    }
    const woke = () => document.visibilityState === 'visible' && soon()

    const stop = watchTables(JSON.parse(key) as LiveSource[], soon, { client, onReady: soon })
    document.addEventListener('visibilitychange', woke)
    window.addEventListener('online', soon)
    return () => {
      clearTimeout(timer)
      stop()
      document.removeEventListener('visibilitychange', woke)
      window.removeEventListener('online', soon)
    }
  }, [key, client])
}
