import type { Page, Request, Route } from '@playwright/test'

// Answers the Supabase Auth, REST and Edge Function calls in the browser, so
// these tests run with no hosted project. tests/hosted/ covers the real one.
export type FakeUser = {
  username: string
  password: string
  role: 'admin' | 'player'
  balance?: number
  removed?: boolean
  /** Has accepted an open event, so removal refuses them. */
  inOpenEvent?: boolean
}

export type FakeMovement = {
  username: string
  delta: number
  balance_after: number
  concept: string | null
  kind?: string
  details?: Record<string, unknown>
  created_at?: string
  event?: { id: string; name: string } | null
  actor?: { username: string } | null
}

export type FakeEvent = {
  id: string
  name: string
  buy_in: number
  creator: string
  status?: 'open' | 'completed' | 'cancelled'
  payouts?: [number, number, number]
  /** By username. The creator is added as accepted if missing. */
  people?: Record<string, 'invited' | 'accepted' | 'declined' | 'lapsed'>
  results?: { place: number; user_id: string; percentage: number; amount: number }[] | null
  /** Set for a game. Its settings default to the duel's. */
  game?: string
  phase?: 'inviting' | 'choosing' | 'revealed'
  settings?: typeof duelDefaults & { description: string }
  reveal?: FakeReveal | null
  creator_plays?: boolean
}

export type FakeReveal = { players: { user_id: string; choice: string; percentage: number; payout: number }[] }

export const duelDefaults = { both_trust: 150, betrayer: 250, betrayed: 0, both_betray: 50 }
export const duelDescription = 'Dues persones, una decisió secreta.'

export const admin: FakeUser = { username: 'marc', password: 'contrasenya-de-prova', role: 'admin' }
export const player: FakeUser = { username: 'anna', password: 'una-altra-de-prova', role: 'player' }

const minimumPassword = 6

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) })

const preflight = (route: Route) =>
  route.request().method() === 'OPTIONS' ? route.fulfill({ status: 204, headers: cors }).then(() => true) : Promise.resolve(false)

const authUser = (user: FakeUser) => ({
  id: user.username,
  aud: 'authenticated',
  role: 'authenticated',
  email: `${user.username}@marcona.invalid`,
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-11-06T00:00:00Z',
})

const session = (user: FakeUser) => {
  const expiresIn = 3600
  const payload = Buffer.from(JSON.stringify({ sub: user.username, exp: Math.floor(Date.now() / 1000) + expiresIn }))
  return {
    access_token: `e30.${payload.toString('base64url')}.signature`,
    token_type: 'bearer',
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    refresh_token: 'refresh',
    user: authUser(user),
  }
}

const usernameFromToken = (route: Route) => {
  const token = route.request().headers().authorization?.replace('Bearer ', '') ?? ''
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub as string
  } catch {
    return null
  }
}

export async function fakeSupabase(
  page: Page,
  users: FakeUser[] = [admin, player],
  movements: FakeMovement[] = [],
  seededEvents: FakeEvent[] = [],
) {
  const people = users.map((user) => ({ balance: 0, ...user }))
  const ledger = movements.map((movement, index) => ({
    id: index + 1,
    kind: 'admin_adjustment',
    created_at: `2026-11-06T1${index % 10}:00:00Z`,
    ...movement,
  }))
  const results = new Map<string, unknown>()
  const events = seededEvents.map((event, index) => ({
    status: 'open' as const,
    payouts: [50, 30, 20] as [number, number, number],
    results: null,
    created_at: `2026-11-06T1${index % 10}:00:00Z`,
    finished_at: null as string | null,
    game: null as string | null,
    phase: null as FakeEvent['phase'] | null,
    settings: event.game ? { ...duelDefaults, description: duelDescription } : null,
    reveal: null as FakeReveal | null,
    creator_plays: true,
    ...event,
    people: {
      ...(event.creator_plays === false ? {} : { [event.creator]: 'accepted' as const }),
      ...event.people,
    } as NonNullable<FakeEvent['people']>,
  }))
  const calls = {
    logins: [] as string[],
    logouts: 0,
    adjustments: [] as string[],
    /** Every call to an event function, with its arguments. */
    eventCalls: [] as { fn: string; [argument: string]: unknown }[],
    events,
    functions: [] as { action: string }[],
    /** Sessions the server has ended, by username. */
    ended: new Set<string>(),
    ledger,
    /** The colours the next spins land on, in order. Red once it's empty. */
    spinResults: [] as ('red' | 'black' | 'white')[],
    roulette: { enabled: true, white_one_in: 37, max_bet_percent: 5 },
    games: [{ id: 'confia_o_traeix', enabled: true, description: duelDescription, settings: { ...duelDefaults } }],
    /** Secret choices by event and username, which no fake read returns. */
    choices: {} as Record<string, Record<string, string>>,
    /** How many times game_state() has been read. */
    statePolls: 0,
    /** Plays another phone: locks in as this player, and reveals if that completes the pair. */
    lockInAs: (_eventId: string, _username: string, _choice: string) => {},
  }

  await page.route('**/auth/v1/token**', async (route) => {
    if (await preflight(route)) return
    const { email, password } = route.request().postDataJSON()
    calls.logins.push(email)
    const user = people.find((u) => `${u.username}@marcona.invalid` === email && u.password === password)
    if (!user) return json(route, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' })
    if (user.removed) return json(route, 400, { code: 400, error_code: 'user_banned', msg: 'User is banned' })
    calls.ended.delete(user.username)
    return json(route, 200, session(user))
  })

  await page.route('**/auth/v1/logout**', async (route) => {
    if (await preflight(route)) return
    calls.logouts += 1
    return route.fulfill({ status: 204, headers: cors })
  })

  await page.route('**/auth/v1/user**', async (route) => {
    if (await preflight(route)) return
    const username = usernameFromToken(route)
    const user = people.find((u) => u.username === username)
    if (!user || calls.ended.has(user.username)) {
      return json(route, 403, { code: 403, error_code: 'session_not_found', msg: 'Session not found' })
    }
    return json(route, 200, authUser(user))
  })

  await page.route('**/rest/v1/profiles**', async (route) => {
    if (await preflight(route)) return
    const id = new URL(route.request().url()).searchParams.get('user_id')?.replace('eq.', '')
    if (!id) {
      return json(
        route,
        200,
        people.map((u) => ({
          user_id: u.username,
          username: u.username,
          balance: u.balance,
          removed_at: u.removed ? '2026-11-06T00:00:00Z' : null,
        })),
      )
    }
    const user = people.find((u) => u.username === id)
    if (!user) return json(route, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' })
    return json(route, 200, { username: user.username, role: user.role })
  })

  await page.route('**/rest/v1/ledger**', async (route) => {
    if (await preflight(route)) return
    const url = new URL(route.request().url())
    const id = url.searchParams.get('user_id')?.replace('eq.', '')
    const before = Number(url.searchParams.get('id')?.replace('lt.', '') ?? Infinity)
    const limit = Number(url.searchParams.get('limit') ?? 1000)
    const rows = ledger
      .filter((movement) => (!id || movement.username === id) && movement.id < before)
      .sort((a, b) => b.id - a.id)
      .slice(0, limit)
      .map(({ username, ...movement }) => ({
        event: null,
        actor: null,
        ...movement,
        user_id: username,
        who: { username },
      }))
    return json(route, 200, rows)
  })

  await page.route('**/rest/v1/rpc/admin_adjust', async (route) => {
    if (await preflight(route)) return
    const body = route.request().postDataJSON()
    const refuse = (code: string) => json(route, 400, { code: 'P0001', message: code, details: null, hint: null })
    calls.adjustments.push(body.p_request_id)

    const concept = body.p_concept?.trim()
    if (!concept) return refuse('concept_required')
    const amount = body.p_amount
    if (amount === null || amount < 1 || !Number.isInteger(amount)) return refuse('invalid_amount')
    if (results.has(body.p_request_id)) return json(route, 200, results.get(body.p_request_id))

    const user = people.find((u) => u.username === body.p_user_id)
    if (!user) return refuse('user_not_found')
    const delta = body.p_action === 'add' ? amount : -amount
    if (user.balance + delta < 0) return refuse('insufficient_balance')

    user.balance += delta
    const movement = {
      id: ledger.length + 1,
      kind: 'admin_adjustment',
      created_at: new Date().toISOString(),
      username: user.username,
      delta,
      balance_after: user.balance,
      concept,
    }
    ledger.push(movement)
    const result = { movement_id: movement.id, user_id: user.username, delta, balance_after: user.balance }
    results.set(body.p_request_id, result)
    return json(route, 200, result)
  })

  await page.route('**/rest/v1/games**', async (route) => {
    if (await preflight(route)) return
    return json(route, 200, calls.games)
  })

  await page.route('**/rest/v1/events**', async (route) => {
    if (await preflight(route)) return
    const id = new URL(route.request().url()).searchParams.get('id')?.replace('eq.', '')
    const rows = events
      .filter((event) => !id || event.id === id)
      .map(({ creator, people: everyone, payouts, ...event }) => ({
        ...event,
        type: event.game ? 'game' : 'classic',
        creator_id: creator,
        creator: { username: creator },
        payout_first: event.game ? null : payouts[0],
        payout_second: event.game ? null : payouts[1],
        payout_third: event.game ? null : payouts[2],
        participants: Object.entries(everyone).map(([username, status]) => ({
          user_id: username,
          status,
          who: { username },
        })),
      }))
    return json(route, 200, id ? rows.slice(0, 1) : [...rows].reverse())
  })

  const move = (user: (typeof people)[number], delta: number, kind: string, event: (typeof events)[number], actor: string) => {
    user.balance += delta
    ledger.push({
      id: ledger.length + 1,
      kind,
      created_at: new Date().toISOString(),
      username: user.username,
      delta,
      balance_after: user.balance,
      concept: null,
      event: { id: event.id, name: event.name },
      actor: { username: actor },
    })
  }

  // A handler returns the function's result, or refuse(code).
  const refuse = (code: string, details: string | null = null) => ({ refused: code, details })

  const eventFunction = (
    fn: string,
    handler: (body: ReturnType<Request['postDataJSON']>, caller: (typeof people)[number]) => object,
  ) =>
    page.route(`**/rest/v1/rpc/${fn}`, async (route) => {
      if (await preflight(route)) return
      const body = route.request().postDataJSON()
      calls.eventCalls.push({ fn, ...body })
      if (results.has(body.p_request_id)) return json(route, 200, results.get(body.p_request_id))

      const caller = people.find((u) => u.username === usernameFromToken(route))
      if (!caller) return json(route, 403, { code: '42501', message: 'not_allowed' })

      const outcome = handler(body, caller)
      if ('refused' in outcome) {
        const { refused, details } = outcome as ReturnType<typeof refuse>
        if (refused === 'not_allowed') return json(route, 403, { code: '42501', message: refused })
        return json(route, 400, { code: 'P0001', message: refused, details, hint: null })
      }
      results.set(body.p_request_id, outcome)
      return json(route, 200, outcome)
    })

  const findEvent = (id: string) => events.find((event) => event.id === id)

  await eventFunction('create_event', (body, caller) => {
    const name = String(body.p_name ?? '').trim()
    const buyIn = Number(body.p_buy_in)
    const payouts = [body.p_payout_first, body.p_payout_second, body.p_payout_third].map(Number) as [number, number, number]
    const invitees = (body.p_invitees ?? []) as string[]
    const forced = Boolean(body.p_force)

    if (forced && caller.role !== 'admin') return refuse('not_allowed')
    if (!name) return refuse('event_name_required')
    if (name.length > 40) return refuse('event_name_too_long')
    if (!Number.isInteger(buyIn) || buyIn < 1) return refuse('invalid_buy_in')
    if (payouts.some((payout) => !Number.isInteger(payout) || payout < 0) || payouts[0] + payouts[1] + payouts[2] !== 100) {
      return refuse('invalid_percentages')
    }
    if (invitees.length === 0) return refuse('no_invitees')
    if (caller.balance < buyIn) return refuse('insufficient_balance')

    const players = invitees.map((id) => people.find((u) => u.username === id)!)
    const short = players.filter((user) => user.balance < buyIn).map((user) => user.username)
    if (forced && short.length > 0) return refuse('forced_insufficient_balance', short.sort().join(', '))

    const event = {
      id: `event-${events.length + 1}`,
      name,
      buy_in: buyIn,
      creator: caller.username,
      status: 'open' as const,
      payouts,
      results: null,
      created_at: new Date().toISOString(),
      finished_at: null,
      game: null,
      phase: null,
      settings: null,
      reveal: null,
      creator_plays: true,
      people: {
        [caller.username]: 'accepted',
        ...Object.fromEntries(invitees.map((id) => [id, forced ? 'accepted' : 'invited'])),
      } as NonNullable<FakeEvent['people']>,
    }
    events.push(event)
    for (const user of [caller, ...(forced ? players : [])]) move(user, -buyIn, 'event_buy_in', event, caller.username)
    return { event_id: event.id }
  })

  await eventFunction('answer_invitation', (body, caller) => {
    const event = findEvent(body.p_event_id)
    if (!event) return refuse('event_not_found')
    if (event.status !== 'open') return refuse('event_not_open')
    if (event.people[caller.username] !== 'invited') return refuse('invitation_not_pending')
    if (body.p_accept) {
      if (caller.balance < event.buy_in) return refuse('insufficient_balance')
      move(caller, -event.buy_in, 'event_buy_in', event, caller.username)
    }
    event.people[caller.username] = body.p_accept ? 'accepted' : 'declined'
    if (event.game) {
      if (!body.p_accept) cancel(event, caller.username)
      else if (!Object.values(event.people).includes('invited')) event.phase = 'choosing'
    }
    return { event_id: event.id }
  })

  const lapse = (event: (typeof events)[number]) => {
    for (const [username, status] of Object.entries(event.people)) {
      if (status === 'invited') event.people[username] = 'lapsed'
    }
    event.finished_at = new Date().toISOString()
  }

  const accepted = (event: (typeof events)[number]) =>
    Object.keys(event.people).filter((username) => event.people[username] === 'accepted')

  const cancel = (event: (typeof events)[number], actor: string) => {
    for (const username of accepted(event)) {
      move(people.find((u) => u.username === username)!, event.buy_in, 'event_refund', event, actor)
    }
    lapse(event)
    Object.assign(event, { status: 'cancelled' })
  }

  await eventFunction('cancel_event', (body, caller) => {
    const event = findEvent(body.p_event_id)
    if (!event) return refuse('event_not_found')
    if (event.status !== 'open') return refuse('event_not_open')
    if (event.creator !== caller.username && caller.role !== 'admin') return refuse('not_allowed')
    cancel(event, caller.username)
    return { event_id: event.id }
  })

  await eventFunction('complete_event', (body, caller) => {
    const event = findEvent(body.p_event_id)
    if (!event) return refuse('event_not_found')
    if (event.game) return refuse('game_decides_winners')
    if (event.status !== 'open') return refuse('event_not_open')
    if (event.creator !== caller.username) return refuse('not_allowed')

    const players = accepted(event)
    if (players.length < 2) return refuse('not_enough_participants')
    const pot = event.buy_in * players.length
    const two = players.length === 2
    const percentages = two ? [100, 0, 0] : event.payouts
    const winners = [body.p_first, body.p_second, body.p_third] as (string | null)[]
    const paid = [0, 1, 2].filter((index) => percentages[index] > 0)
    const chosen = paid.map((index) => winners[index])
    if (chosen.some((winner) => !winner || !players.includes(winner)) || new Set(chosen).size !== chosen.length) {
      return refuse('invalid_winners')
    }

    const shares = percentages.map((percentage) => Math.floor((pot * percentage) / 100))
    shares[paid[0]] += pot - shares[0] - shares[1] - shares[2]
    const places = paid.map((index) => ({
      place: index + 1,
      user_id: winners[index]!,
      percentage: percentages[index],
      amount: shares[index],
    }))
    for (const place of places) {
      if (place.amount > 0) {
        move(people.find((u) => u.username === place.user_id)!, place.amount, 'event_payout', event, caller.username)
      }
    }
    lapse(event)
    Object.assign(event, { status: 'completed', results: places })
    return { event_id: event.id, results: places }
  })

  await eventFunction('create_game_event', (body, caller) => {
    if (caller.role !== 'admin') return refuse('not_allowed')
    const name = String(body.p_name ?? '').trim()
    const buyIn = Number(body.p_buy_in)
    const invitees = (body.p_invitees ?? []) as string[]
    const plays = Boolean(body.p_plays)
    const forced = Boolean(body.p_force)

    if (!name) return refuse('event_name_required')
    if (name.length > 40) return refuse('event_name_too_long')
    if (!Number.isInteger(buyIn) || buyIn < 1) return refuse('invalid_buy_in')
    const game = calls.games.find((candidate) => candidate.id === body.p_game)
    if (!game) return refuse('game_not_found')
    if (!game.enabled) return refuse('game_off')
    if (invitees.length + (plays ? 1 : 0) !== 2) return refuse('duel_needs_two_players')

    const players = invitees.map((id) => people.find((u) => u.username === id)!)
    const short = players.filter((user) => user.balance < buyIn).map((user) => user.username)
    if (forced && short.length > 0) return refuse('forced_insufficient_balance', short.sort().join(', '))
    if (plays && caller.balance < buyIn) return refuse('insufficient_balance')

    const event = {
      id: `event-${events.length + 1}`,
      name,
      buy_in: buyIn,
      creator: caller.username,
      status: 'open' as const,
      payouts: [100, 0, 0] as [number, number, number],
      results: null,
      created_at: new Date().toISOString(),
      finished_at: null,
      game: game.id,
      phase: (forced ? 'choosing' : 'inviting') as FakeEvent['phase'],
      settings: { ...game.settings, description: game.description },
      reveal: null,
      creator_plays: plays,
      people: {
        ...(plays ? { [caller.username]: 'accepted' } : {}),
        ...Object.fromEntries(invitees.map((id) => [id, forced ? 'accepted' : 'invited'])),
      } as NonNullable<FakeEvent['people']>,
    }
    events.push(event)
    for (const user of [...(plays ? [caller] : []), ...(forced ? players : [])]) {
      move(user, -buyIn, 'event_buy_in', event, caller.username)
    }
    return { event_id: event.id }
  })

  const resolveDuel = (event: (typeof events)[number]) => {
    const choices = calls.choices[event.id]
    const rules = event.settings!
    const [one, other] = accepted(event)
    const percentage = (mine: string, theirs: string) =>
      mine === 'confia'
        ? theirs === 'confia' ? rules.both_trust : rules.betrayed
        : theirs === 'confia' ? rules.betrayer : rules.both_betray
    const players = [[one, other], [other, one]].map(([me, them]) => {
      const share = percentage(choices[me], choices[them])
      return { user_id: me, choice: choices[me], percentage: share, payout: Math.floor((event.buy_in * share) / 100) }
    })
    for (const player of players) {
      if (player.payout > 0) {
        move(people.find((u) => u.username === player.user_id)!, player.payout, 'event_payout', event, event.creator)
      }
    }
    Object.assign(event, { status: 'completed', phase: 'revealed', reveal: { players }, finished_at: new Date().toISOString() })
  }

  const saveChoice = (event: (typeof events)[number], username: string, choice: string) => {
    const choices = (calls.choices[event.id] ??= {})
    choices[username] = choice
    const revealed = accepted(event).every((player) => choices[player])
    if (revealed) resolveDuel(event)
    return revealed
  }

  calls.lockInAs = (eventId, username, choice) => {
    saveChoice(findEvent(eventId)!, username, choice)
  }

  await eventFunction('lock_in', (body, caller) => {
    const event = findEvent(body.p_event_id)
    if (!event?.game) return refuse('event_not_found')
    if (event.people[caller.username] !== 'accepted') return refuse('not_allowed')
    if (event.status === 'cancelled') return refuse('event_not_open')
    if (event.phase === 'revealed') return { event_id: event.id, saved: false, revealed: true }
    if (event.phase !== 'choosing') return refuse('game_not_choosing')
    if (body.p_choice !== 'confia' && body.p_choice !== 'traeix') return refuse('invalid_game_choice')
    return { event_id: event.id, saved: true, revealed: saveChoice(event, caller.username, body.p_choice) }
  })

  await page.route('**/rest/v1/rpc/game_state', async (route) => {
    if (await preflight(route)) return
    calls.statePolls += 1
    const event = findEvent(route.request().postDataJSON().p_event_id)
    if (!event?.game) return json(route, 400, { code: 'P0001', message: 'event_not_found', details: null, hint: null })
    const { id, game, status, phase, settings, reveal } = event
    return json(route, 200, { event_id: id, game, status, phase, settings, reveal })
  })

  const maxBet = (balance: number) => Math.max(1, Math.floor((balance * calls.roulette.max_bet_percent) / 100))

  await page.route('**/rest/v1/rpc/roulette_state', async (route) => {
    if (await preflight(route)) return
    const caller = people.find((u) => u.username === usernameFromToken(route))
    if (!caller) return json(route, 403, { code: '42501', message: 'not_allowed' })
    return json(route, 200, { ...calls.roulette, balance: caller.balance, max_bet: maxBet(caller.balance) })
  })

  await page.route('**/rest/v1/rpc/set_roulette_settings', async (route) => {
    if (await preflight(route)) return
    const body = route.request().postDataJSON()
    const caller = people.find((u) => u.username === usernameFromToken(route))
    if (caller?.role !== 'admin') return json(route, 403, { code: '42501', message: 'not_allowed' })

    const refused = (code: string) => json(route, 400, { code: 'P0001', message: code, details: null, hint: null })
    const whole = (value: unknown, lowest: number, highest: number) =>
      Number.isInteger(value) && (value as number) >= lowest && (value as number) <= highest
    if (!whole(body.p_white_one_in, 2, 1000)) return refused('invalid_white_chance')
    if (!whole(body.p_max_bet_percent, 1, 100)) return refused('invalid_max_bet_percent')

    calls.roulette.enabled = body.p_enabled
    calls.roulette.white_one_in = body.p_white_one_in
    calls.roulette.max_bet_percent = body.p_max_bet_percent
    return json(route, 200, calls.roulette)
  })

  await eventFunction('spin', (body, caller) => {
    const bet = body.p_bet
    if (body.p_choice !== 'red' && body.p_choice !== 'black') return refuse('invalid_choice')
    if (!Number.isInteger(bet) || bet < 1) return refuse('invalid_bet')
    if (!calls.roulette.enabled) return refuse('roulette_closed')
    if (bet > caller.balance) return refuse('insufficient_balance')
    if (bet > maxBet(caller.balance)) return refuse('bet_too_high')

    const result = calls.spinResults.shift() ?? 'red'
    const won = result === body.p_choice
    const delta = won ? bet : -bet
    caller.balance += delta
    const movement = {
      id: ledger.length + 1,
      kind: 'roulette_spin',
      created_at: new Date().toISOString(),
      username: caller.username,
      delta,
      balance_after: caller.balance,
      concept: null,
      details: { choice: body.p_choice, result },
      actor: { username: caller.username },
    }
    ledger.push(movement)
    return { movement_id: movement.id, choice: body.p_choice, result, won, bet, delta, balance_after: caller.balance }
  })

  await page.route('**/functions/v1/admin-users', async (route) => {
    if (await preflight(route)) return
    const body = route.request().postDataJSON()
    calls.functions.push(body)
    const refuse = (code: string, status = 400) => json(route, status, { error: code })

    const caller = people.find((u) => u.username === usernameFromToken(route))
    if (caller?.role !== 'admin') return refuse('not_allowed', 403)

    if (body.action === 'create') {
      if (!/^[a-z0-9_-]{3,20}$/.test(body.username)) return refuse('invalid_username')
      if (people.some((u) => u.username === body.username)) return refuse('username_taken')
      if (body.password.length < minimumPassword) return refuse('weak_password')
      people.push({ username: body.username, password: body.password, role: 'player', balance: 0 })
      return json(route, 200, { userId: body.username, username: body.username })
    }

    const target = people.find((u) => u.username === body.userId)
    if (!target) return refuse('user_not_found')

    if (body.action === 'reset') {
      if (body.password.length < minimumPassword) return refuse('weak_password')
      target.password = body.password
      calls.ended.add(target.username)
      return json(route, 200, { ok: true })
    }

    if (target.username === caller.username) return refuse('cannot_remove_self')
    if (target.inOpenEvent) return refuse('user_in_open_event')
    target.removed = true
    calls.ended.add(target.username)
    return json(route, 200, { ok: true })
  })

  return calls
}

export async function logIn(page: Page, user: FakeUser) {
  await page.getByLabel("Nom d'usuari").fill(user.username)
  await page.getByLabel('Contrasenya').fill(user.password)
  await page.getByRole('button', { name: 'Entra' }).click()
  await page.locator('[data-screen="classificacio"]').waitFor()
}
