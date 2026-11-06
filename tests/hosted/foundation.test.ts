import { afterAll, describe, expect, it } from 'vitest'
import { errorMessage } from '../../src/i18n/errors'
import { text } from '../../src/i18n/text'
import { adminClient, adminLogin, publicClient, signOutAll } from './env'

afterAll(signOutAll)

describe('without a login', () => {
  it('REQ-008: reads no rows from profiles', async () => {
    const { data, error } = await publicClient().from('profiles').select('*')
    // Either an empty result or a refusal: both mean no data.
    expect(data ?? []).toEqual([])
    if (error) expect(error.code).toBe('42501')
  })

  it('REQ-008: cannot write to profiles', async () => {
    const { error } = await publicClient().from('profiles').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      username: 'intrus',
    })
    expect(error).not.toBeNull()
  })

  it('REQ-009: cannot read the RLS report', async () => {
    const { error } = await publicClient().rpc('rls_report')
    expect(error).not.toBeNull()
  })

  it('REQ-010: cannot sign up', async () => {
    const email = `intrus-${Date.now()}@marcona.invalid`
    const { data, error } = await publicClient().auth.signUp({ email, password: 'una-contrasenya-llarga-1' })
    expect(error).not.toBeNull()
    expect(data.user).toBeNull()
  })
})

describe('logging in', () => {
  it('REQ-005, REQ-019: a wrong password gives the error we translate', async () => {
    const { email } = adminLogin()
    const { data, error } = await publicClient().auth.signInWithPassword({ email, password: 'no-es-aquesta' })
    expect(data.session).toBeNull()
    expect(errorMessage(error)).toBe(text.errors.invalidCredentials)
  })

  it('REQ-003, REQ-004: the placeholder email domain works for a real login', async () => {
    const client = await adminClient()
    const { data } = await client.auth.getSession()
    expect(data.session?.user.email).toBe(adminLogin().email)
  })
})

describe('as the admin', () => {
  it('REQ-013: the profile says admin', async () => {
    const client = await adminClient()
    const { data, error } = await client.from('profiles').select('username, role').eq('username', adminLogin().username)
    expect(error).toBeNull()
    expect(data).toEqual([{ username: adminLogin().username, role: 'admin' }])
  })

  it('REQ-009: the RLS report lists no table', async () => {
    const client = await adminClient()
    const { data, error } = await client.rpc('rls_report')
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('REQ-008: even the admin cannot write to profiles from the browser', async () => {
    const client = await adminClient()
    const { error } = await client.from('profiles').update({ role: 'player' }).eq('username', adminLogin().username)
    expect(error).not.toBeNull()
  })
})

