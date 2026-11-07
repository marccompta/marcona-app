// Creates, removes and resets users. The secret key only exists here, and
// only the active admin gets past activeAdmin().
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'
import { authErrorCode, isValidUsername, usernameToEmail } from './validate.ts'

const secretKey = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Requests carry a bearer token, not cookies, so any origin is safe.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const fail = (code: string, status = 400) => reply(status, { error: code })

type Body = { action?: unknown; username?: unknown; password?: unknown; isTest?: unknown; userId?: unknown }

// REQ-055: checks the token with Auth, then that the profile is the active admin.
async function activeAdmin(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!token) return null
  const { data } = await supabase.auth.getUser(token)
  if (!data.user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, removed_at')
    .eq('user_id', data.user.id)
    .maybeSingle()
  return profile?.role === 'admin' && !profile.removed_at ? data.user.id : null
}

async function createUser({ username, password, isTest }: Body) {
  if (!isValidUsername(username)) return fail('invalid_username')
  if (typeof password !== 'string' || !password) return fail('weak_password')

  // REQ-037: removed users keep their row, so their usernames stay taken.
  const { data: taken, error: lookupError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('username', username)
    .maybeSingle()
  if (lookupError) return fail('failed', 500)
  if (taken) return fail('username_taken')

  const { data, error } = await supabase.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
  })
  if (error) return fail(authErrorCode(error.code))

  const userId = data.user.id
  const { error: insertError } = await supabase
    .from('profiles')
    .insert({ user_id: userId, username, is_test: isTest === true })
  if (insertError) {
    await supabase.auth.admin.deleteUser(userId)
    return fail(insertError.code === '23505' ? 'username_taken' : 'failed')
  }
  return reply(200, { userId, username })
}

// Only the secret key can call this. Admin sign-out needs the user's own token,
// so the function deletes their rows in auth.sessions instead.
async function endSessions(userId: string) {
  const { error } = await supabase.rpc('revoke_sessions', { p_user_id: userId })
  if (error) throw error
}

async function findProfile(userId: unknown) {
  if (typeof userId !== 'string') return null
  const { data } = await supabase.from('profiles').select('removed_at').eq('user_id', userId).maybeSingle()
  return data
}

async function resetPassword({ userId, password }: Body) {
  if (typeof password !== 'string' || !password) return fail('weak_password')
  const profile = await findProfile(userId)
  if (!profile || profile.removed_at) return fail('user_not_found')

  const { error } = await supabase.auth.admin.updateUserById(userId as string, { password })
  if (error) return fail(authErrorCode(error.code))

  await endSessions(userId as string)
  return reply(200, { ok: true })
}

// REQ-053: the database goes first, so removal takes effect at once. Every step
// is safe to repeat, so a removal that fails halfway can simply be retried.
async function removeUser({ userId }: Body, adminId: string) {
  if (userId === adminId) return fail('cannot_remove_self')
  const profile = await findProfile(userId)
  if (!profile) return fail('user_not_found')

  // REQ-095, REQ-096: this also declines invitations, or refuses during an open event.
  const { error: removalError } = await supabase.rpc('remove_profile', { p_user_id: userId })
  if (removalError?.message === 'user_in_open_event') return fail('user_in_open_event')
  if (removalError) throw removalError

  const { error } = await supabase.auth.admin.updateUserById(userId as string, { ban_duration: '876000h' })
  if (error) throw error

  await endSessions(userId as string)
  return reply(200, { ok: true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return fail('not_allowed', 405)

  try {
    const adminId = await activeAdmin(req)
    if (!adminId) return fail('not_allowed', 403)

    const body: Body = await req.json()
    if (body.action === 'create') return await createUser(body)
    if (body.action === 'reset') return await resetPassword(body)
    if (body.action === 'remove') return await removeUser(body, adminId)
    return fail('unknown_action')
  } catch (error) {
    console.error(error)
    return fail('failed', 500)
  }
})
