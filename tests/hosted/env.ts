import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { config } from '../../src/config'
import { callAdminUsers } from '../../src/lib/adminUsers'

// Reads the admin's login from the gitignored .env.test.local. See docs/setup.md.
function localEnv() {
  if (!existsSync('.env.test.local')) return {} as Record<string, string>
  const lines = readFileSync('.env.test.local', 'utf8').split(/\r?\n/)
  return Object.fromEntries(
    lines.filter((line) => line.includes('=')).map((line) => {
      const at = line.indexOf('=')
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()]
    }),
  )
}

export function adminLogin() {
  const env = localEnv()
  const username = env.MARCONA_ADMIN_USERNAME
  const password = env.MARCONA_ADMIN_PASSWORD
  if (!username || !password) throw new Error('Add MARCONA_ADMIN_USERNAME and MARCONA_ADMIN_PASSWORD to .env.test.local')
  return { username, password, email: `${username}@${config.emailDomain}` }
}

// A fresh client that keeps nothing between tests, using only the publishable key.
export const publicClient = () =>
  createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

const openClients: ReturnType<typeof publicClient>[] = []

export async function adminClient() {
  const client = publicClient()
  openClients.push(client)
  const { email, password } = adminLogin()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return client
}

// Ends the sessions these tests opened.
export async function signOutAll() {
  await Promise.all(openClients.splice(0).map((client) => client.auth.signOut({ scope: 'local' })))
}

// Accounts made here have is_test set, so real users never see them. They stay
// until the wipe in slice 008, because usernames are never reused.
const runId = Date.now().toString(36).slice(-6)
export const testPassword = 'proves-de-la-marcona-1'
export const testUsername = (name: string) => `t${runId}-${name}`

export type TestUser = {
  userId: string
  username: string
  password: string
  client: ReturnType<typeof publicClient>
}

const testUsers: TestUser[] = []

export async function logInAs(username: string, password: string) {
  const client = publicClient()
  openClients.push(client)
  const { error } = await client.auth.signInWithPassword({ email: `${username}@${config.emailDomain}`, password })
  if (error) throw error
  return client
}

export async function createTestUser(name: string): Promise<TestUser> {
  const admin = await adminClient()
  const username = testUsername(name)
  const { userId } = await callAdminUsers(admin, { action: 'create', username, password: testPassword, isTest: true })
  const user = { userId, username, password: testPassword, client: await logInAs(username, testPassword) }
  testUsers.push(user)
  return user
}
