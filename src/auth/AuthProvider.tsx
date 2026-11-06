import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { errorMessage } from '../i18n/errors'
import { text } from '../i18n/text'
import { supabase } from '../lib/supabase'
import { isValidUsername, normaliseUsername, usernameToEmail } from './username'

export type Profile = { username: string; role: 'admin' | 'player' }

type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'failed'; message: string }
  | { status: 'ready'; profile: Profile }

type Auth = {
  state: AuthState
  /** Resolves to a Catalan error, or null if the login worked. */
  logIn: (username: string, password: string) => Promise<string | null>
  logOut: () => void
}

const AuthContext = createContext<Auth | null>(null)

async function logIn(username: string, password: string) {
  const name = normaliseUsername(username)
  if (!name || !password) return text.errors.missingFields
  if (!isValidUsername(name)) return text.errors.invalidCredentials

  try {
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(name), password })
    return error ? errorMessage(error) : null
  } catch (error) {
    return errorMessage(error)
  }
}

// 'local' clears this device before calling the server, so it works offline.
function logOut() {
  void supabase.auth.signOut({ scope: 'local' })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // undefined until Supabase has read any stored session.
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (userId === undefined) return
    if (userId === null) {
      setState({ status: 'anonymous' })
      return
    }

    let current = true
    setState({ status: 'loading' })
    supabase
      .from('profiles')
      .select('username, role')
      .eq('user_id', userId)
      .maybeSingle<Profile>()
      .then(({ data, error }) => {
        if (!current) return
        if (data) setState({ status: 'ready', profile: data })
        else setState({ status: 'failed', message: error ? errorMessage(error) : text.errors.noProfile })
      })
    return () => {
      current = false
    }
  }, [userId])

  return <AuthContext.Provider value={{ state, logIn, logOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth needs an AuthProvider')
  return auth
}
