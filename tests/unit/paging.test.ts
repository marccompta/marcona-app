import { describe, expect, it, vi } from 'vitest'
import { fetchMovements, fetchPeople } from '../../src/lib/data'

vi.mock('../../src/lib/supabase', () => ({ supabase: {} }))

// Just enough of a query builder to read a ledger, newest first, where another
// movement lands after each page, as it does on a busy night.
function busyLedger(size: number) {
  const rows = Array.from({ length: size }, (_, index) => ({ id: index + 1 }))
  const newestFirst = () => [...rows].reverse()
  const land = () => rows.push({ id: rows.length + 1 })

  const query = () => {
    let filtered = newestFirst()
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      lt: (_column: string, id: number) => {
        filtered = filtered.filter((row) => row.id < id)
        return builder
      },
      limit: (count: number) => {
        filtered = filtered.slice(0, count)
        return builder
      },
      range: (from: number, to: number) => {
        filtered = filtered.slice(from, to + 1)
        return builder
      },
      then: (resolve: (result: { data: unknown[]; error: null }) => void) => {
        resolve({ data: filtered, error: null })
        land()
      },
    }
    return builder
  }

  return { from: query }
}

describe('reading the ledger', () => {
  it('REQ-067: shows every movement once, even when others land while it reads', async () => {
    const movements = await fetchMovements(undefined, busyLedger(2500) as never)
    const ids = movements.map((movement) => movement.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual([...ids].sort((a, b) => b - a))
    expect(ids.at(-1)).toBe(1)
  })
})

// Supabase caps a response at 1,000 rows, as this fake does.
function manyProfiles(size: number) {
  const rows = Array.from({ length: size }, (_, index) => ({ user_id: `u${String(index).padStart(5, '0')}` }))

  const query = () => {
    let filtered = [...rows]
    const builder = {
      select: () => builder,
      order: () => builder,
      gt: (_column: string, userId: string) => {
        filtered = filtered.filter((row) => row.user_id > userId)
        return builder
      },
      limit: (count: number) => {
        filtered = filtered.slice(0, count)
        return builder
      },
      then: (resolve: (result: { data: unknown[]; error: null }) => void) =>
        resolve({ data: filtered.slice(0, 1000), error: null }),
    }
    return builder
  }

  return { from: query }
}

describe('reading people', () => {
  it('REQ-216: reads everyone, beyond the 1,000 rows one response can hold', async () => {
    const people = await fetchPeople(manyProfiles(2345) as never)
    const ids = people.map((person) => person.user_id)

    expect(ids).toHaveLength(2345)
    expect(new Set(ids).size).toBe(2345)
  })
})
