import { NavLink } from 'react-router'
import { text } from '../i18n/text'
import { TabIcon, type TabIconName } from './icons'

type Tab = { to: string; icon: TabIconName; label: string }

const shared: Tab[] = [
  { to: '/classificacio', icon: 'ranking', label: text.tabs.ranking },
  { to: '/esdeveniments', icon: 'events', label: text.tabs.events },
  { to: '/ruleta', icon: 'roulette', label: text.tabs.roulette },
  { to: '/auditoria', icon: 'audit', label: text.tabs.audit },
]
const admin: Tab = { to: '/administracio', icon: 'admin', label: text.tabs.admin }

export function TabBar({ role }: { role: 'admin' | 'player' }) {
  const tabs = role === 'admin' ? [...shared, admin] : shared
  return (
    <nav className="tabs" aria-label={text.tabs.label}>
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} className="tab">
          <TabIcon name={tab.icon} />
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
