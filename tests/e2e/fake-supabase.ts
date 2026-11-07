import type { Page, Route } from '@playwright/test'

// Answers the Supabase Auth, REST and Edge Function calls in the browser, so
// these tests run with no hosted project. tests/hosted/ covers the real one.
export type FakeUser = {
  username: string
  password: string
  role: 'admin' | 'player'
  balance?: number
  removed?: boolean
}

export type FakeMovement = {
  username: string
  delta: number
  balance_after: number
  concept: string | null
  kind?: string
  created_at?: string
}

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

export async function fakeSupabase(page: Page, users: FakeUser[] = [admin, player], movements: FakeMovement[] = []) {
  const people = users.map((user) => ({ balance: 0, ...user }))
  const ledger = movements.map((movement, index) => ({
    id: index + 1,
    kind: 'admin_adjustment',
    created_at: `2026-11-06T1${index % 10}:00:00Z`,
    ...movement,
  }))
  const results = new Map<string, unknown>()
  const calls = {
    logins: [] as string[],
    logouts: 0,
    adjustments: [] as string[],
    functions: [] as { action: string }[],
    /** Sessions the server has ended, by username. */
    ended: new Set<string>(),
    ledger,
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
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const limit = Number(url.searchParams.get('limit') ?? 1000)
    const rows = ledger
      .filter((movement) => !id || movement.username === id)
      .sort((a, b) => b.id - a.id)
      .slice(offset, offset + limit)
      .map(({ username, ...movement }) => ({ ...movement, user_id: username, who: { username } }))
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
