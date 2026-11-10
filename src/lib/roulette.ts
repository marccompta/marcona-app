import { supabase } from './supabase'

export type Choice = 'red' | 'black'
export type Colour = Choice | 'white'

// What the wheel draws: one white pocket, then red and black in turn. It's only
// a picture, and the odds come from the server's settings.
export const pockets: Colour[] = ['white', ...Array.from({ length: 36 }, (_, index) => (index % 2 ? 'black' : 'red') as Colour)]
export const pocketStep = 360 / pockets.length

// The pocket under the pointer, which sits at the top of the wheel.
export function pocketAt(rotation: number) {
  const index = Math.round(-rotation / pocketStep) % pockets.length
  return pockets[(index + pockets.length) % pockets.length]
}

// REQ-112: where the wheel must stop to show this result. It always travels
// forward. `pick`, from 0 up to 1, only chooses among pockets of that colour.
export function stopRotation(result: Colour, from: number, minimumTravel: number, pick: number) {
  const matching = pockets.flatMap((colour, index) => (colour === result ? [index] : []))
  const pocket = matching[Math.floor(pick * matching.length)]
  const resting = (360 - pocket * pocketStep) % 360
  return resting + Math.ceil((from + minimumTravel - resting) / 360) * 360
}

export type Spin = {
  movement_id: number
  choice: Choice
  result: Colour
  won: boolean
  bet: number
  delta: number
  balance_after: number
}

export type RouletteSettings = { enabled: boolean; white_one_in: number; max_bet_percent: number }

/** The settings, plus this player's balance and maximum bet, worked out on the server. */
export type RouletteTable = RouletteSettings & { balance: number; max_bet: number }

export async function fetchRoulette(client = supabase) {
  const { data, error } = await client.rpc('roulette_state')
  if (error) throw error
  return data as RouletteTable
}

export async function saveRouletteSettings(settings: RouletteSettings, client = supabase) {
  const { error } = await client.rpc('set_roulette_settings', {
    p_enabled: settings.enabled,
    p_white_one_in: settings.white_one_in,
    p_max_bet_percent: settings.max_bet_percent,
  })
  if (error) throw error
}

export async function spin(
  { requestId, choice, bet }: { requestId: string; choice: Choice; bet: number },
  client = supabase,
) {
  const { data, error } = await client.rpc('spin', { p_request_id: requestId, p_choice: choice, p_bet: bet })
  if (error) throw error
  return data as Spin
}

// REQ-222: after a spin that lowered the maximum, a whole-number bet above it
// drops to the maximum, so the next spin isn't refused. Anything else stays as
// typed, for the server to refuse in Catalan.
export function fitBet(bet: string, maxBet: number) {
  return /^\s*\d+\s*$/.test(bet) && Number(bet) > maxBet ? String(maxBet) : bet
}

// REQ-219 to REQ-221: the board of the player's last results, newest first.
// Each is keyed by its movement, so the first read and a spin made while it
// was on its way merge without losing or repeating anything.
export const boardSize = 10

export type BoardResult = { id: number; result: Colour }

export function addToBoard(board: BoardResult[], ...results: BoardResult[]) {
  const byId = new Map([...board, ...results].map((entry) => [entry.id, entry]))
  return [...byId.values()].sort((a, b) => b.id - a.id).slice(0, boardSize)
}

/** The board's places, with null for each one not yet filled. */
export function boardPlaces(board: BoardResult[]): (Colour | null)[] {
  return Array.from({ length: boardSize }, (_, index) => board[index]?.result ?? null)
}

// REQ-219: the player's own last spins, from the ledger, which already stores
// each result. Nothing else is read or kept.
export async function fetchRecentResults(client = supabase): Promise<BoardResult[]> {
  const { data: session } = await client.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return []
  const { data, error } = await client
    .from('ledger')
    .select('id, details')
    .eq('user_id', userId)
    .eq('kind', 'roulette_spin')
    .order('id', { ascending: false })
    .limit(boardSize)
  if (error) throw error
  return (data ?? []).map((movement) => ({ id: movement.id, result: (movement.details as { result: Colour }).result }))
}
