const tabPaths = {
  ranking: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8.5 20h7" />
    </>
  ),
  events: (
    <>
      <rect x="4" y="7" width="11" height="13" rx="2" />
      <path d="M9 4h9a2 2 0 0 1 2 2v11" />
      <path d="M9.5 11l2 2.4-2 2.4-2-2.4 2-2.4Z" />
    </>
  ),
  roulette: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5V9M12 15v5.5M3.5 12H9M15 12h5.5M6 6l3.9 3.9M14.1 14.1 18 18M18 6l-3.9 3.9M9.9 14.1 6 18" />
    </>
  ),
  audit: (
    <>
      <path d="M7 4h9a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H9a2 2 0 0 1-2-2V4Z" />
      <path d="M7 4a2 2 0 0 0-2 2v2h2M10.5 9h4.5M10.5 13h4.5" />
    </>
  ),
  admin: (
    <>
      <path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6l7-2.5Z" />
      <path d="m9.2 12 2 2 3.8-4" />
    </>
  ),
}

export type TabIconName = keyof typeof tabPaths

export function TabIcon({ name }: { name: TabIconName }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {tabPaths[name]}
    </svg>
  )
}

// A drawn spade, because the ♠ character can turn into an emoji on some phones.
export function Spade() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2C9 6.5 3.5 9.5 3.5 14a4.5 4.5 0 0 0 7.2 3.6c-.2 1.5-.9 2.7-2.2 4.4h7c-1.3-1.7-2-2.9-2.2-4.4A4.5 4.5 0 0 0 20.5 14C20.5 9.5 15 6.5 12 2Z" />
    </svg>
  )
}

export function Flourish() {
  return (
    <svg className="flourish" width="92" height="12" viewBox="0 0 92 12" fill="none" strokeWidth=".9" aria-hidden="true">
      <path d="M0 6h34M58 6h34M46 1l5 5-5 5-5-5 5-5Z" />
    </svg>
  )
}

// An empty chip seen from above, drawn in gold line.
export function EmptyChip() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="56" strokeWidth="1.2" />
      <circle cx="60" cy="60" r="40" strokeWidth="1" />
      <circle cx="60" cy="60" r="35" strokeWidth=".8" strokeDasharray="1.5 4" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <path key={angle} d="M60 5v14" strokeWidth="3" transform={`rotate(${angle} 60 60)`} />
      ))}
      <path d="M60 48l12 12-12 12-12-12 12-12Z" strokeWidth="1" />
    </svg>
  )
}
