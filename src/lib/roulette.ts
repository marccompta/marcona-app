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

export async function spin(
  { requestId, choice, bet }: { requestId: string; choice: Choice; bet: number },
  client = supabase,
) {
  const { data, error } = await client.rpc('spin', { p_request_id: requestId, p_choice: choice, p_bet: bet })
  if (error) throw error
  return data as Spin
}
