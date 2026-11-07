import { supabase } from './supabase'

export type EventStatus = 'open' | 'completed' | 'cancelled'
export type ParticipantStatus = 'invited' | 'accepted' | 'declined' | 'lapsed'

export type Participant = { user_id: string; status: ParticipantStatus; who: { username: string } }

export type Place = { place: number; user_id: string; percentage: number; amount: number }

export type MarconaEvent = {
  id: string
  name: string
  buy_in: number
  status: EventStatus
  creator_id: string
  payout_first: number
  payout_second: number
  payout_third: number
  results: Place[] | null
  created_at: string
  finished_at: string | null
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

const columns = `id, name, buy_in, status, creator_id, payout_first, payout_second, payout_third, results, created_at, finished_at,
  creator:profiles!events_creator_id_fkey(username),
  participants:event_participants(user_id, status, who:profiles(username))`

// Newest first. A night of events stays far below the 1,000 rows of one response.
export async function fetchEvents(client = supabase) {
  const { data, error } = await client.from('events').select(columns).order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as MarconaEvent[]
}

export const inEvent = (event: MarconaEvent) => event.participants.filter((person) => person.status === 'accepted')

// REQ-090: the buy-in times the people who have paid it.
export const potOf = (event: MarconaEvent) => event.buy_in * inEvent(event).length

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
