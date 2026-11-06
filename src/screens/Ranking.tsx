import { text } from '../i18n/text'
import { EmptyChip } from '../shell/icons'

// Slice 002 adds the list of players. Until then the table is always empty.
export function Ranking() {
  return (
    <section className="screen" data-screen="classificacio">
      <h1 className="screen-title">{text.ranking.title}</h1>
      <div className="empty">
        <EmptyChip />
        <h2>{text.ranking.emptyTitle}</h2>
        <p>{text.ranking.emptyBody}</p>
      </div>
    </section>
  )
}
