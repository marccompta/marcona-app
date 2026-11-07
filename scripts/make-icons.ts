// Draws the home screen icons from the logo's spade, as PNGs in public/icons/.
// Run it after changing the design: npx tsx scripts/make-icons.ts
import { writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const spade =
  'M12 2C9 6.5 3.5 9.5 3.5 14a4.5 4.5 0 0 0 7.2 3.6c-.2 1.5-.9 2.7-2.2 4.4h7c-1.3-1.7-2-2.9-2.2-4.4A4.5 4.5 0 0 0 20.5 14C20.5 9.5 15 6.5 12 2Z'

// The colours are the site's design tokens.
function icon({ frame, scale }: { frame: boolean; scale: number }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="felt" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#116a49"/>
      <stop offset="0.55" stop-color="#073b2b"/>
      <stop offset="1" stop-color="#031a15"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fbe9a6"/>
      <stop offset="0.45" stop-color="#f0c24b"/>
      <stop offset="0.75" stop-color="#c8952b"/>
      <stop offset="1" stop-color="#fbe9a6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#felt)"/>${
    frame
      ? `
  <rect x="34" y="34" width="444" height="444" fill="none" stroke="#f0c24b" stroke-opacity=".6" stroke-width="4"/>
  <rect x="48" y="48" width="416" height="416" fill="none" stroke="#f0c24b" stroke-opacity=".3" stroke-width="2"/>`
      : ''
  }
  <path fill="url(#gold)" transform="translate(256 256) scale(${scale}) translate(-12 -12)" d="${spade}"/>
</svg>
`
}

// The plain icon has a gold frame. A maskable icon can be cut to any shape, so
// it has no frame and keeps the spade inside the middle 80%.
const plain = icon({ frame: true, scale: 12 })
const maskable = icon({ frame: false, scale: 10.5 })

writeFileSync('public/icon.svg', plain)

const browser = await chromium.launch()
const page = await browser.newPage()
for (const [file, svg, size] of [
  ['public/icons/icon-192.png', plain, 192],
  ['public/icons/icon-512.png', plain, 512],
  ['public/icons/icon-maskable-512.png', maskable, 512],
  ['public/icons/apple-touch-icon.png', plain, 180],
] as const) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<style>body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`)
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: size, height: size } })
}
await browser.close()
