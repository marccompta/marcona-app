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
