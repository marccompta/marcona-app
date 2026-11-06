import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { config } from '../../src/config'

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

export async function adminClient() {
  const client = publicClient()
  const { email, password } = adminLogin()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return client
}
