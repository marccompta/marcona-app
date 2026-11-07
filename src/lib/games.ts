import { text } from '../i18n/text'
import { supabase } from './supabase'

export type DuelChoice = 'confia' | 'traeix'
export const duelChoices: DuelChoice[] = ['confia', 'traeix']

export type DuelSettings = { both_trust: number; betrayer: number; betrayed: number; both_betray: number }

export type Game = { id: string; enabled: boolean; description: string; settings: DuelSettings }

/** What an event keeps of its game's settings when it's created. */
export type EventGameSettings = DuelSettings & { description: string }

export type RevealedPlayer = { user_id: string; choice: DuelChoice; percentage: number; payout: number }
export type Reveal = { players: RevealedPlayer[] }

export type Phase = 'inviting' | 'choosing' | 'revealed'

export type GameState = {
  event_id: string
  game: string
  status: 'open' | 'completed' | 'cancelled'
  phase: Phase
  settings: EventGameSettings
  reveal: Reveal | null
}

export type LockIn = { event_id: string; saved: boolean; revealed: boolean }

export type NewGameEvent = {
  requestId: string
  game: string
  name: string
  buyIn: number
  plays: boolean
  invitees: string[]
  force: boolean
}

// REQ-140 to REQ-143: only for showing the rules. The server decides what's paid.
export function duelOutcomes(buyIn: number, settings: DuelSettings) {
  const share = (percent: number) => Math.floor((buyIn * percent) / 100)
  return {
    bothTrust: share(settings.both_trust),
    betrayer: share(settings.betrayer),
    betrayed: share(settings.betrayed),
    bothBetray: share(settings.both_betray),
  }
}

export const gameName = (id: string) => text.games.names[id as keyof typeof text.games.names] ?? id

export async function fetchGames(client = supabase) {
  const { data, error } = await client.from('games').select('id, enabled, description, settings').order('id')
  if (error) throw error
  return data as Game[]
}

export async function fetchGameState(eventId: string, client = supabase) {
  const { data, error } = await client.rpc('game_state', { p_event_id: eventId })
  if (error) throw error
  return data as GameState
}

export async function createGameEvent(
  { requestId, game, name, buyIn, plays, invitees, force }: NewGameEvent,
  client = supabase,
) {
  const { data, error } = await client.rpc('create_game_event', {
    p_request_id: requestId,
    p_game: game,
    p_name: name,
    p_buy_in: buyIn,
    p_plays: plays,
    p_invitees: invitees,
    p_force: force,
  })
  if (error) throw error
  return (data as { event_id: string }).event_id
}

// The client gives a failed fetch no code, and a TypeError is what errorMessage()
// words as a lost connection.
export async function lockIn(
  { requestId, eventId, choice }: { requestId: string; eventId: string; choice: DuelChoice },
  client = supabase,
) {
  const { data, error } = await client.rpc('lock_in', { p_request_id: requestId, p_event_id: eventId, p_choice: choice })
  if (error) throw error.code ? error : new TypeError(error.message)
  return data as LockIn
}

type TapQueueOptions = {
  send: (choice: DuelChoice, requestId: string) => Promise<LockIn>
  onResult: (choice: DuelChoice, answer: LockIn) => void
  onFailed: (error: unknown) => void
  retryMs?: number
}

// REQ-202: taps go to the server one at a time, and only the newest waiting tap is
// kept, so a slow network can't make an older tap win. REQ-062: a lost reply is
// sent once more with the same ID, so it can't count twice.
export function createTapQueue({ send, onResult, onFailed, retryMs = 800 }: TapQueueOptions) {
  let waiting: DuelChoice | null = null
  let sending = false

  async function sendWithRetry(choice: DuelChoice) {
    const requestId = crypto.randomUUID()
    try {
      return await send(choice, requestId)
    } catch (error) {
      if (!(error instanceof TypeError)) throw error
      await new Promise((resolve) => setTimeout(resolve, retryMs))
      return send(choice, requestId)
    }
  }

  async function drain() {
    sending = true
    while (waiting) {
      const choice = waiting
      waiting = null
      try {
        const answer = await sendWithRetry(choice)
        if (answer.revealed) waiting = null
        onResult(choice, answer)
      } catch (error) {
        onFailed(error)
      }
    }
    sending = false
  }

  return {
    tap(choice: DuelChoice) {
      waiting = choice
      if (!sending) void drain()
    },
  }
}
