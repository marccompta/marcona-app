import { useEffect, useState } from 'react'
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
  created_at: string
  who: { username: string }
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
export async function fetchPeople(client = supabase) {
  const { data, error } = await client.from('profiles').select('user_id, username, balance, removed_at')
  if (error) throw error
  return data as Person[]
}

// REQ-050, REQ-063, REQ-064: active people, highest first, then alphabetically.
export const rankPeople = (people: Person[]) =>
  people
    .filter((person) => !person.removed_at)
    .sort((a, b) => b.balance - a.balance || a.username.localeCompare(b.username, 'ca'))

// REQ-067: newest first. Supabase caps a response at 1,000 rows, so this reads
// page by page to show every movement.
export async function fetchMovements(userId?: string, client = supabase) {
  const movements: Movement[] = []
  for (let from = 0; ; from += pageSize) {
    let query = client
      .from('ledger')
      .select('id, user_id, delta, balance_after, kind, concept, created_at, who:profiles!ledger_user_id_fkey(username)')
    if (userId) query = query.eq('user_id', userId)

    const { data, error } = await query.order('id', { ascending: false }).range(from, from + pageSize - 1)
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
export function useLoad<T>(load: () => Promise<T>, key: unknown = null) {
  const [state, setState] = useState<Loaded<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    load().then(
      (data) => current && setState({ status: 'ready', data }),
      (error) => current && setState({ status: 'failed', message: errorMessage(error) }),
    )
    return () => {
      current = false
    }
    // load is a new function on every render, so key says when it really changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt])

  return { state, reload: () => setAttempt((count) => count + 1) }
}
