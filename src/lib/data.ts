import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../i18n/errors'
import { supabase } from './supabase'

export type Person = { user_id: string; username: string; balance: number; removed_at: string | null }

export type Movement = {
  id: number
  user_id: string
  delta: number
  balance_after: number
  kind: string
  concept: string | null
  /** A spin holds its `choice` and `result`. */
  details: Record<string, unknown>
  created_at: string
  who: { username: string }
  event: { id: string; name: string } | null
  /** Null when this viewer can't see them, as a test account can't see the admin. */
  actor: { username: string } | null
}

export type Adjustment = {
  requestId: string
  userId: string
  action: 'add' | 'remove'
  amount: number
  concept: string
}

const pageSize = 1000

// Everyone this user may see, including removed people, whom the audit still names.
// REQ-216: Supabase caps a response at 1,000 rows, so this reads page by page,
// each starting after the last ID seen. Otherwise, past 1,000 people, some would
// silently be missing from the ranking.
export async function fetchPeople(client = supabase) {
  const people: Person[] = []
  for (;;) {
    let query = client.from('profiles').select('user_id, username, balance, removed_at')
    const last = people.at(-1)
    if (last) query = query.gt('user_id', last.user_id)

    const { data, error } = await query.order('user_id').limit(pageSize)
    if (error) throw error
    people.push(...(data as Person[]))
    if (data.length < pageSize) return people
  }
}

// REQ-050, REQ-063, REQ-064: active people, highest first, then alphabetically.
export const rankPeople = (people: Person[]) =>
  people
    .filter((person) => !person.removed_at)
    .sort((a, b) => b.balance - a.balance || a.username.localeCompare(b.username, 'ca'))

// REQ-067: newest first. Supabase caps a response at 1,000 rows, so this reads
// page by page to show every movement. Each page starts after the last ID seen,
// because a movement landing mid-read would shift a page counted by position.
export async function fetchMovements(userId?: string, client = supabase) {
  const movements: Movement[] = []
  for (;;) {
    let query = client
      .from('ledger')
      .select(
        `id, user_id, delta, balance_after, kind, concept, details, created_at, who:profiles!ledger_user_id_fkey(username),
        actor:profiles!ledger_actor_id_fkey(username), event:events(id, name)`,
      )
    if (userId) query = query.eq('user_id', userId)
    const last = movements.at(-1)
    if (last) query = query.lt('id', last.id)

    const { data, error } = await query.order('id', { ascending: false }).limit(pageSize)
    if (error) throw error
    movements.push(...(data as unknown as Movement[]))
    if (data.length < pageSize) return movements
  }
}

export async function adjustBalance({ requestId, userId, action, amount, concept }: Adjustment, client = supabase) {
  const { error } = await client.rpc('admin_adjust', {
    p_request_id: requestId,
    p_user_id: userId,
    p_action: action,
    p_amount: amount,
    p_concept: concept,
  })
  if (error) throw error
}

export type Loaded<T> = { status: 'loading' } | { status: 'failed'; message: string } | { status: 'ready'; data: T }

// Loads data for a screen, again whenever key changes or reload() is called.
//
// REQ-216: a reload never throws away a read that's under way. That read shows
// when it finishes, and then one more read picks up anything that changed
// meanwhile, however many reloads came. Otherwise, with changes arriving faster
// than a long read takes, such as a big audit while people play, no read would
// ever finish. A new key does discard the old key's read.
export function useLoad<T>(load: () => Promise<T>, key: unknown = null) {
  const [state, setState] = useState<Loaded<T>>({ status: 'loading' })
  const latest = useRef(load)
  latest.current = load
  const request = useRef(() => {})

  useEffect(() => {
    let current = true
    let running = false
    let again = false

    const read = () => {
      if (running) {
        again = true
        return
      }
      running = true
      latest
        .current()
        .then(
          (data) => current && setState({ status: 'ready', data }),
          (error) => current && setState({ status: 'failed', message: errorMessage(error) }),
        )
        .finally(() => {
          running = false
          if (current && again) {
            again = false
            read()
          }
        })
    }

    request.current = read
    read()
    return () => {
      current = false
    }
  }, [key])

  const reload = useCallback(() => request.current(), [])
  return { state, reload }
}
