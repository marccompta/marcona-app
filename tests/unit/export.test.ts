import { describe, expect, it } from 'vitest'
import { exportFileNames, ledgerCsv, type ExportDump } from '../../src/lib/readiness'

const dump: ExportDump = {
  exported_at: '2026-11-08T21:05:00Z',
  users: [
    { user_id: 'u-admin', username: 'marc', role: 'admin', balance: 10, is_test: false, removed_at: null, created_at: '' },
    { user_id: 'u-anna', username: 'anna', role: 'player', balance: 5, is_test: false, removed_at: null, created_at: '' },
    { user_id: 'u-dash', username: '-dash', role: 'player', balance: 0, is_test: false, removed_at: null, created_at: '' },
  ],
  events: [{ id: 'e-1', name: 'Sopar, "gran"', participants: [] }],
  ledger: [
    {
      id: 1,
      user_id: 'u-anna',
      delta: 15,
      balance_after: 15,
      kind: 'admin_adjustment',
      concept: 'Benvinguda',
      event_id: null,
      actor_id: 'u-admin',
      details: {},
      created_at: '2026-11-08T20:00:00Z',
    },
    {
      id: 2,
      user_id: 'u-anna',
      delta: -10,
      balance_after: 5,
      kind: 'event_buy_in',
      concept: null,
      event_id: 'e-1',
      actor_id: 'u-anna',
      details: {},
      created_at: '2026-11-08T20:01:00Z',
    },
    {
      id: 3,
      user_id: 'u-dash',
      delta: 3,
      balance_after: 3,
      kind: 'admin_adjustment',
      concept: '=SUM(A1)\nline two',
      event_id: null,
      actor_id: 'u-admin',
      details: { place: 1 },
      created_at: '2026-11-08T20:02:00Z',
    },
  ],
}

const rows = (csv: string) => csv.replace(/^\uFEFF/, '').split('\r\n')

describe('ledger CSV', () => {
  it('REQ-164: has one row per movement, with names instead of IDs', () => {
    const lines = rows(ledgerCsv(dump))
    expect(lines[0]).toBe('id,data,usuari,canvi,saldo_despres,tipus,concepte,esdeveniment,qui,detalls')
    expect(lines[1]).toBe('1,2026-11-08T20:00:00Z,anna,15,15,admin_adjustment,Benvinguda,,marc,{}')
    expect(lines).toHaveLength(dump.ledger.length + 1)
  })

  it('REQ-164: quotes commas, quotes and line breaks', () => {
    expect(rows(ledgerCsv(dump))[2]).toBe('2,2026-11-08T20:01:00Z,anna,-10,5,event_buy_in,,"Sopar, ""gran""",anna,{}')
  })

  it('REQ-164: keeps a spreadsheet from running text as a formula, but leaves numbers alone', () => {
    const csv = ledgerCsv(dump).replace(/^\uFEFF/, '')
    expect(csv).toContain(`3,2026-11-08T20:02:00Z,'-dash,3,3,admin_adjustment,"'=SUM(A1)\nline two",,marc,"{""place"":1}"`)
  })

  it('REQ-164: starts with a byte order mark, so accents open correctly in a spreadsheet', () => {
    expect(ledgerCsv(dump).startsWith('\uFEFF')).toBe(true)
  })

  it('REQ-164: names both files after the moment of the export', () => {
    expect(exportFileNames(new Date(2026, 10, 8, 21, 5))).toEqual({
      json: 'marcona-2026-11-08-2105.json',
      csv: 'marcona-moviments-2026-11-08-2105.csv',
    })
  })
})
