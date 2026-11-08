import { text } from '../i18n/text'
import { supabase } from './supabase'

export type DuelChoice = 'confia' | 'traeix'
export const duelChoices: DuelChoice[] = ['confia', 'traeix']

export type DuelSettings = { both_trust: number; betrayer: number; betrayed: number; both_betray: number }

// REQ-193: La minoria's options have fixed keys, and the labels are settings.
export type MinoriaChoice = 'a' | 'b'
export const minoriaChoices: MinoriaChoice[] = ['a', 'b']
export type MinoriaSettings = { option_a: string; option_b: string }
export const minoria = 'la_minoria'

export type Game =
  | { id: 'confia_o_traeix'; enabled: boolean; description: string; settings: DuelSettings }
  | { id: typeof minoria; enabled: boolean; description: string; settings: MinoriaSettings }

/** What an event keeps of its game's settings when it's created. */
export type EventGameSettings = (DuelSettings | MinoriaSettings) & { description: string }

export type RevealedPlayer = { user_id: string; choice: DuelChoice; percentage: number; payout: number }
export type MinoriaPlayer = { user_id: string; choice: MinoriaChoice; payout: number }
export type MinoriaResult = {
  verdict: 'split' | 'tie' | 'unanimous'
  minority: MinoriaChoice | null
  share: number | null
  remainder_to: string | null
  players: MinoriaPlayer[]
}
export type DuelResult = { players: RevealedPlayer[] }
export type Reveal = DuelResult | MinoriaResult

export const optionLabel = (settings: MinoriaSettings, choice: MinoriaChoice) =>
  choice === 'a' ? settings.option_a : settings.option_b

export type Phase = 'inviting' | 'choosing' | 'revealed'

export type GameState = {
  event_id: string
  game: string
  status: 'open' | 'completed' | 'cancelled'
  phase: Phase
  settings: EventGameSettings
  reveal: Reveal | null
  /** La minoria only: who has locked in, never what they chose (REQ-197). */
  locked_in?: string[]
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

export function duelVerdict(players: RevealedPlayer[]) {
  const betrayals = players.filter((player) => player.choice === 'traeix').length
  return betrayals === 0 ? 'bothTrust' : betrayals === 1 ? 'betrayal' : 'bothBetray'
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

export async function saveGameSettings(
  {
    game,
    enabled,
    description,
    settings,
  }: { game: string; enabled: boolean; description: string; settings: DuelSettings | MinoriaSettings },
  client = supabase,
) {
  const { error } = await client.rpc('set_game_settings', {
    p_game: game,
    p_enabled: enabled,
    p_description: description,
    p_settings: settings,
  })
  if (error) throw error
}

// REQ-156: only the creator, once at least 3 have paid.
export async function startGame({ requestId, eventId }: { requestId: string; eventId: string }, client = supabase) {
  const { error } = await client.rpc('start_game', { p_request_id: requestId, p_event_id: eventId })
  if (error) throw error
}

// A La minoria player's own choice, which is final. Null for anyone else.
export async function fetchMyChoice(eventId: string, client = supabase) {
  const { data, error } = await client.rpc('my_choice', { p_event_id: eventId })
  if (error) throw error
  return (data as { choice: MinoriaChoice | null }).choice
}

// The client gives a failed fetch no code, and a TypeError is what errorMessage()
// words as a lost connection.
export async function lockIn(
  { requestId, eventId, choice }: { requestId: string; eventId: string; choice: DuelChoice | MinoriaChoice },
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
    /** True while a tap is on its way, whose answer may hold the reveal. */
    busy: () => sending,
  }
}
