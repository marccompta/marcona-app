import { text } from '../i18n/text'
import type { EventGameSettings, Phase, Reveal } from './games'
import type { LiveSource } from './live'
import { supabase } from './supabase'

export type EventStatus = 'open' | 'completed' | 'cancelled'
export type ParticipantStatus = 'invited' | 'accepted' | 'declined' | 'lapsed'

export type Participant = { user_id: string; status: ParticipantStatus; who: { username: string } }

export type Place = { place: number; user_id: string; percentage: number; amount: number }

export type MarconaEvent = {
  id: string
  type: 'classic' | 'game'
  name: string
  buy_in: number
  status: EventStatus
  creator_id: string
  /** Null on a game, whose payouts come from its settings. */
  payout_first: number | null
  payout_second: number | null
  payout_third: number | null
  results: Place[] | null
  created_at: string
  finished_at: string | null
  game: string | null
  settings: EventGameSettings | null
  phase: Phase | null
  reveal: Reveal | null
  creator_plays: boolean
  creator: { username: string }
  participants: Participant[]
}

export type NewEvent = {
  requestId: string
  name: string
  buyIn: number
  invitees: string[]
  payouts: [number, number, number]
  force: boolean
}

const columns = `id, type, name, buy_in, status, creator_id, payout_first, payout_second, payout_third, results, created_at, finished_at,
  game, settings, phase, reveal, creator_plays,
  creator:profiles!events_creator_id_fkey(username),
  participants:event_participants(user_id, status, who:profiles(username))`

// Newest first. A night of events stays far below the 1,000 rows of one response.
export async function fetchEvents(client = supabase) {
  const { data, error } = await client.from('events').select(columns).order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as MarconaEvent[]
}

export async function fetchEvent(id: string, client = supabase) {
  const { data, error } = await client.from('events').select(columns).eq('id', id).maybeSingle()
  if (error) throw error
  return data as unknown as MarconaEvent | null
}

// REQ-152: what changes one event, for watching it live.
export const liveEvent = (id: string): LiveSource[] => [
  { table: 'events', filter: `id=eq.${id}` },
  { table: 'event_participants', filter: `event_id=eq.${id}` },
]

export const inEvent = (event: MarconaEvent) => event.participants.filter((person) => person.status === 'accepted')

// REQ-090: the buy-in times the people who have paid it.
export const potOf = (event: MarconaEvent) => event.buy_in * inEvent(event).length

// The places with a percentage above 0, which are the only ones that need a winner.
export const paidPlaces = (event: MarconaEvent) =>
  [event.payout_first, event.payout_second, event.payout_third]
    .map((percentage, index) => ({ index, percentage: percentage ?? 0, name: text.events.places[index] }))
    .filter((place) => place.percentage > 0)

const isInvited = (event: MarconaEvent, me: string) =>
  event.status === 'open' &&
  event.participants.some((person) => person.who.username === me && person.status === 'invited')

// REQ-097: my invitations, then what's open, then what's over.
export function groupEvents(events: MarconaEvent[], me: string) {
  const invitations = events.filter((event) => isInvited(event, me))
  return {
    invitations,
    open: events.filter((event) => event.status === 'open' && !invitations.includes(event)),
    past: events.filter((event) => event.status !== 'open'),
  }
}

export async function createEvent({ requestId, name, buyIn, invitees, payouts, force }: NewEvent, client = supabase) {
  const { data, error } = await client.rpc('create_event', {
    p_request_id: requestId,
    p_name: name,
    p_buy_in: buyIn,
    p_invitees: invitees,
    p_payout_first: payouts[0],
    p_payout_second: payouts[1],
    p_payout_third: payouts[2],
    p_force: force,
  })
  if (error) throw error
  return (data as { event_id: string }).event_id
}

export async function answerInvitation(
  { requestId, eventId, accept }: { requestId: string; eventId: string; accept: boolean },
  client = supabase,
) {
  const { error } = await client.rpc('answer_invitation', { p_request_id: requestId, p_event_id: eventId, p_accept: accept })
  if (error) throw error
}

export async function cancelEvent({ requestId, eventId }: { requestId: string; eventId: string }, client = supabase) {
  const { error } = await client.rpc('cancel_event', { p_request_id: requestId, p_event_id: eventId })
  if (error) throw error
}

export async function completeEvent(
  { requestId, eventId, winners }: { requestId: string; eventId: string; winners: [string | null, string | null, string | null] },
  client = supabase,
) {
  const { error } = await client.rpc('complete_event', {
    p_request_id: requestId,
    p_event_id: eventId,
    p_first: winners[0],
    p_second: winners[1],
    p_third: winners[2],
  })
  if (error) throw error
}
