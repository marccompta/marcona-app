import type { Page, Route } from '@playwright/test'

// Answers the Supabase Auth and REST calls in the browser, so these tests run
// with no hosted project. tests/hosted/ covers the real one.
export type FakeUser = { username: string; password: string; role: 'admin' | 'player' }

export const admin: FakeUser = { username: 'marc', password: 'contrasenya-de-prova', role: 'admin' }
export const player: FakeUser = { username: 'anna', password: 'una-altra-de-prova', role: 'player' }

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) })

const session = (user: FakeUser) => {
  const expiresIn = 3600
  const payload = Buffer.from(JSON.stringify({ sub: user.username, exp: Math.floor(Date.now() / 1000) + expiresIn }))
  return {
    access_token: `e30.${payload.toString('base64url')}.signature`,
    token_type: 'bearer',
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    refresh_token: 'refresh',
    user: {
      id: user.username,
      aud: 'authenticated',
      role: 'authenticated',
      email: `${user.username}@marcona.invalid`,
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-11-06T00:00:00Z',
    },
  }
}

export async function fakeSupabase(page: Page, users: FakeUser[] = [admin, player]) {
  const calls = { logins: [] as string[], logouts: 0 }

  await page.route('**/auth/v1/token**', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    const { email, password } = route.request().postDataJSON()
    calls.logins.push(email)
    const user = users.find((u) => `${u.username}@marcona.invalid` === email && u.password === password)
    if (!user) return json(route, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' })
    return json(route, 200, session(user))
  })

  await page.route('**/auth/v1/logout**', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    calls.logouts += 1
    return route.fulfill({ status: 204, headers: cors })
  })

  await page.route('**/rest/v1/profiles**', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    const id = new URL(route.request().url()).searchParams.get('user_id')?.replace('eq.', '')
    const user = users.find((u) => u.username === id)
    if (!user) return json(route, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' })
    return json(route, 200, { username: user.username, role: user.role })
  })

  return calls
}

export async function logIn(page: Page, user: FakeUser) {
  await page.getByLabel("Nom d'usuari").fill(user.username)
  await page.getByLabel('Contrasenya').fill(user.password)
  await page.getByRole('button', { name: 'Entra' }).click()
  await page.locator('[data-screen="classificacio"]').waitFor()
}
