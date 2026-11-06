// Plain rules with no Deno imports, so the unit tests can run them too.
export const emailDomain = 'marcona.invalid'

export const isValidUsername = (username: unknown): username is string =>
  typeof username === 'string' && /^[a-z0-9_-]{3,20}$/.test(username)

export const usernameToEmail = (username: string) => `${username}@${emailDomain}`

const authErrors: Record<string, string> = {
  weak_password: 'weak_password',
  same_password: 'same_password',
  email_exists: 'username_taken',
  user_already_exists: 'username_taken',
}

// Turns a Supabase Auth error code into one of ours, which the app translates.
export const authErrorCode = (code: string | undefined) => (code && authErrors[code]) || 'failed'
