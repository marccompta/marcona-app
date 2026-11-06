import { text } from '../i18n/text'
import { Spade } from './icons'

export function Logo() {
  return (
    <span className="logo">
      <Spade />
      {text.app.name}
    </span>
  )
}
