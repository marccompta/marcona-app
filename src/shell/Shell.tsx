import { Outlet } from 'react-router'
import { useAuth, type Profile } from '../auth/AuthProvider'
import { text } from '../i18n/text'
import { Flourish } from './icons'
import { Logo } from './Logo'
import { TabBar } from './TabBar'

export function Shell({ profile }: { profile: Profile }) {
  const { logOut } = useAuth()

  return (
    <div className="table">
      <div className="frame">
        <header className="masthead">
          <Logo />
          <Flourish />
          <button type="button" className="logout" aria-label={text.session.logoutLabel} onClick={logOut}>
            {text.session.logout}
          </button>
        </header>
        <main className="scroller">
          <Outlet />
        </main>
      </div>
      <TabBar role={profile.role} />
    </div>
  )
}
