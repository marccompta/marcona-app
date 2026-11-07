import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { text } from './i18n/text'
import { Admin } from './screens/Admin'
import { Audit } from './screens/Audit'
import { EventDetail } from './screens/EventDetail'
import { Events } from './screens/Events'
import { Login } from './screens/Login'
import { NewEvent } from './screens/NewEvent'
import { Placeholder } from './screens/Placeholder'
import { Ranking } from './screens/Ranking'
import { UserDetail } from './screens/UserDetail'
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
        <Route path="/classificacio" element={<Ranking me={profile.username} />} />
        <Route path="/classificacio/:username" element={<UserDetail />} />
        <Route path="/esdeveniments" element={<Events me={profile.username} />} />
        <Route path="/esdeveniments/nou" element={<NewEvent profile={profile} />} />
        <Route path="/esdeveniments/:id" element={<EventDetail profile={profile} />} />
        <Route path="/ruleta" element={<Placeholder screen="ruleta" title={text.tabs.roulette} />} />
        <Route path="/auditoria" element={<Audit />} />
        {profile.role === 'admin' && <Route path="/administracio" element={<Admin />} />}
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
