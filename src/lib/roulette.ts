import { supabase } from './supabase'

export type Choice = 'red' | 'black'
export type Colour = Choice | 'white'

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
