import siteQr from 'virtual:site-qr'
import { Link } from 'react-router'
import { config } from '../config'
import { text } from '../i18n/text'

// REQ-153: friends scan this to open the site. It's dark on white whatever the
// theme, with a quiet border, because that's what cameras read best.
export function QrCode() {
  return (
    <section className="screen" data-screen="qr">
      <Link to="/administracio" className="back">
        {text.admin.title}
      </Link>
      <h1 className="detail-name">{text.qr.title}</h1>
      <p className="hint qr-hint">{text.qr.help}</p>
      <div className="qr" data-qr role="img" aria-label={text.qr.label} dangerouslySetInnerHTML={{ __html: siteQr }} />
      <p className="qr-url">{config.siteUrl}</p>
    </section>
  )
}
