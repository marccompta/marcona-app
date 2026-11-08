import { supabase } from './supabase'

export type ExportUser = {
  user_id: string
  username: string
  role: string
  balance: number
  is_test: boolean
  removed_at: string | null
  created_at: string
}

export type ExportEvent = { id: string; name: string; participants: unknown[]; [column: string]: unknown }

export type ExportMovement = {
  id: number
  user_id: string
  delta: number
  balance_after: number
  kind: string
  concept: string | null
  event_id: string | null
  actor_id: string | null
  details: Record<string, unknown>
  created_at: string
}

export type ExportDump = {
  exported_at: string
  users: ExportUser[]
  events: ExportEvent[]
  ledger: ExportMovement[]
}

// REQ-164: everything, from admin_export(), which refuses anyone but the admin.
export async function fetchExport(client = supabase): Promise<ExportDump> {
  const { data, error } = await client.rpc('admin_export')
  if (error) throw error
  return data as ExportDump
}

// A spreadsheet runs a cell starting with one of these as a formula. Only text
// is guarded, so numbers such as a negative change stay numbers.
const formulaStart = /^[=+\-@\t\r]/

function cell(value: unknown, isText: boolean) {
  if (value === null || value === undefined) return ''
  let written = typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (isText && formulaStart.test(written)) written = `'${written}`
  return /[",\r\n]/.test(written) ? `"${written.replaceAll('"', '""')}"` : written
}

// REQ-164: one row per movement, with usernames and event names instead of IDs.
export function ledgerCsv(dump: ExportDump) {
  const usernames = new Map(dump.users.map((user) => [user.user_id, user.username]))
  const eventNames = new Map(dump.events.map((event) => [event.id, event.name]))
  const name = (id: string | null, names: Map<string, string>) => (id ? (names.get(id) ?? id) : null)

  const header = 'id,data,usuari,canvi,saldo_despres,tipus,concepte,esdeveniment,qui,detalls'
  const lines = dump.ledger.map((movement) =>
    [
      cell(movement.id, false),
      cell(movement.created_at, false),
      cell(name(movement.user_id, usernames), true),
      cell(movement.delta, false),
      cell(movement.balance_after, false),
      cell(movement.kind, true),
      cell(movement.concept, true),
      cell(name(movement.event_id, eventNames), true),
      cell(name(movement.actor_id, usernames), true),
      cell(movement.details, true),
    ].join(','),
  )
  return `\uFEFF${[header, ...lines].join('\r\n')}`
}

export function exportFileNames(at: Date) {
  const two = (value: number) => String(value).padStart(2, '0')
  const stamp = `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}-${two(at.getHours())}${two(at.getMinutes())}`
  return { json: `marcona-${stamp}.json`, csv: `marcona-moviments-${stamp}.csv` }
}

export type WipeResult = { users: number; events: number; movements: number }

// REQ-165, REQ-166: admin_wipe() checks the word itself, so a direct call
// without it changes nothing either.
export async function wipeTestData(confirmation: string, client = supabase): Promise<WipeResult> {
  const { data, error } = await client.rpc('admin_wipe', { p_confirmation: confirmation })
  if (error) throw error
  return data as WipeResult
}
