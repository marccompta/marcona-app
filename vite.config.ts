import react from '@vitejs/plugin-react'
import QRCode from 'qrcode'
import { defineConfig, type Plugin } from 'vite'
import { config } from './src/config'

// REQ-153: the QR code is drawn once, at build time, so the site needs no QR library.
function siteQr(): Plugin {
  const id = 'virtual:site-qr'
  // Vite's convention for a module that isn't a file.
  const resolved = '\0' + id
  return {
    name: 'site-qr',
    resolveId: (source) => (source === id ? resolved : undefined),
    async load(source) {
      if (source !== resolved) return
      const svg = await QRCode.toString(config.siteUrl, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        // The white frame around it adds to this quiet zone.
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
      return `export default ${JSON.stringify(svg)}`
    },
  }
}

// REQ-001: GitHub Pages serves the site under this path.
export default defineConfig({
  base: '/marcona-app/',
  plugins: [react(), siteQr()],
})
