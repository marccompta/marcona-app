import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { text } from './i18n/text'
import { Login } from './screens/Login'
import { Placeholder } from './screens/Placeholder'
import { Ranking } from './screens/Ranking'
import { Logo } from './shell/Logo'
import { Shell } from './shell/Shell'

function Splash({ message, onLogOut }: { message: string; onLogOut?: () => void }) {
  return (
    <div className="table table--login">
      <div className="splash">
        <Logo />
        <p role={onLogOut ? 'alert' : 'status'}>{message}</p>
        {onLogOut && (
          <button type="button" className="logout logout--inline" onClick={onLogOut}>
            {text.session.logoutLabel}
          </button>
        )}
      </div>
    </div>
  )
}

function Screens() {
  const { state, logOut } = useAuth()

  if (state.status === 'loading') return <Splash message={text.app.loading} />
  if (state.status === 'anonymous') return <Login />
  if (state.status === 'failed') return <Splash message={state.message} onLogOut={logOut} />

  const { profile } = state
  return (
    <Routes>
      <Route element={<Shell profile={profile} />}>
        <Route path="/classificacio" element={<Ranking />} />
        <Route path="/esdeveniments" element={<Placeholder screen="esdeveniments" title={text.tabs.events} />} />
        <Route path="/ruleta" element={<Placeholder screen="ruleta" title={text.tabs.roulette} />} />
        <Route path="/auditoria" element={<Placeholder screen="auditoria" title={text.tabs.audit} />} />
        {profile.role === 'admin' && (
          <Route path="/administracio" element={<Placeholder screen="administracio" title={text.tabs.admin} />} />
        )}
      </Route>
      <Route path="*" element={<Navigate to="/classificacio" replace />} />
    </Routes>
  )
}

export function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Screens />
      </AuthProvider>
    </HashRouter>
  )
}
