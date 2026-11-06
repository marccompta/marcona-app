import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { text } from '../i18n/text'
import { Flourish } from '../shell/icons'
import { Logo } from '../shell/Logo'

export function Login() {
  const { logIn } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const failure = await logIn(username, password)
    setBusy(false)
    setError(failure)
    if (!failure) navigate('/classificacio', { replace: true })
  }

  return (
    <div className="table table--login">
      <div className="frame">
        <main className="scroller">
          <div className="login screen" data-screen="login">
            <h1 className="logo-heading">
              <Logo />
            </h1>
            <Flourish />
            <form onSubmit={submit} noValidate>
              <label className="field">
                {text.login.username}
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>
              <label className="field">
                {text.login.password}
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </label>
              {error && (
                <p className="notice" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="primary" disabled={busy}>
                {busy ? text.login.submitting : text.login.submit}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}
