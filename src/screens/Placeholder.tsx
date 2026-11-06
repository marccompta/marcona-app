import { text } from '../i18n/text'
import { EmptyChip } from '../shell/icons'

// Stands in for the screens that later slices build.
export function Placeholder({ screen, title }: { screen: string; title: string }) {
  return (
    <section className="screen" data-screen={screen}>
      <h1 className="screen-title">{title}</h1>
      <div className="empty">
        <EmptyChip />
        <p>{text.placeholder.body}</p>
      </div>
    </section>
  )
}
