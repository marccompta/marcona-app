// Renders the visual directions to phone-sized PNGs.
// Run from the repo root: node slices/001-foundation/evidence/directions/render.mjs
// The direction was chosen, so the @fontsource packages are gone. To re-run this,
// install @fontsource/{playfair-display,manrope,bodoni-moda,jost,fraunces,dm-sans}.
import { writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const fonts = pathToFileURL(resolve('node_modules/@fontsource')).href

const face = (pkg, family, weight, style = 'normal') =>
  `@font-face{font-family:'${family}';font-weight:${weight};font-style:${style};src:url('${fonts}/${pkg}/files/${pkg}-latin-${weight}-${style}.woff2') format('woff2')}`

const noise = (opacity) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 ${opacity} 0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E")`

const players = [
  ['marc', 4820, true],
  ['anna', 3650],
  ['jordi', 2980],
  ['laia', 1740],
  ['pau', 920],
  ['nuria', 310],
]
const fmt = (n) => new Intl.NumberFormat('ca-ES', { useGrouping: 'always' }).format(n)

const icons = {
  rank: '<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8.5 20h7"/>',
  events: '<rect x="4" y="7" width="11" height="13" rx="2"/><path d="M9 4h9a2 2 0 0 1 2 2v11"/><path d="M9.5 11l2 2.4-2 2.4-2-2.4 2-2.4Z"/>',
  wheel: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5V9M12 15v5.5M3.5 12H9M15 12h5.5M6 6l3.9 3.9M14.1 14.1 18 18M18 6l-3.9 3.9M9.9 14.1 6 18"/>',
  audit: '<path d="M7 4h9a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H9a2 2 0 0 1-2-2V4Z"/><path d="M7 4a2 2 0 0 0-2 2v2h2M10.5 9h4.5M10.5 13h4.5"/>',
  admin: '<path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6l7-2.5Z"/><path d="m9.2 12 2 2 3.8-4"/>',
}
const tabs = [
  ['rank', 'Classificació'],
  ['events', 'Esdeveniments'],
  ['wheel', 'Ruleta'],
  ['audit', 'Auditoria'],
  ['admin', 'Administració'],
]
const nav = `<nav>${tabs
  .map(
    ([icon, label], i) =>
      `<a class="${i === 0 ? 'on' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[icon]}</svg><span>${label}</span></a>`,
  )
  .join('')}</nav>`

// One chip seen from the side, stacked into a pile that grows with the balance.
const stack = (balance, colours) => {
  const n = Math.max(1, Math.round(balance / 620))
  const height = 10 + (n - 1) * 4.5
  const chips = Array.from({ length: n }, (_, i) => {
    const y = height - 9 - i * 4.5
    const c = colours[i % colours.length]
    return `<g transform="translate(0 ${y})"><ellipse cx="17" cy="4.6" rx="15" ry="4.6" fill="#00000055"/><ellipse cx="17" cy="3.4" rx="15" ry="4.6" fill="${c}"/><ellipse cx="17" cy="3.4" rx="15" ry="4.6" fill="none" stroke="#fff6" stroke-width=".5"/><path d="M4 2.2l3 1.6M30 2.2l-3 1.6M17 -1.2v2.2M17 5.8v2.2" stroke="#f6f1dc" stroke-width="1.5"/></g>`
  }).join('')
  return `<span class="stackbox"><svg class="stack" viewBox="0 -1.5 34 ${height + 1.5}" width="34" height="${height + 1.5}" aria-hidden="true">${chips}</svg></span>`
}

// A chip seen from above, with its edge spots.
const bigChip = (size, inner) => {
  const spots = Array.from({ length: 8 }, (_, i) => {
    const a = i * 45
    return `<rect x="93" y="3" width="14" height="26" rx="2.5" fill="#f6f1dc" transform="rotate(${a} 100 100)"/>`
  }).join('')
  return `<svg width="${size}" height="${size}" viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="g" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#b3322c"/><stop offset="1" stop-color="#6d1214"/></radialGradient><radialGradient id="f" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#14805a"/><stop offset="1" stop-color="#052b20"/></radialGradient><linearGradient id="au" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe9a6"/><stop offset=".5" stop-color="#f0c24b"/><stop offset="1" stop-color="#a97c1c"/></linearGradient></defs><circle cx="100" cy="100" r="98" fill="url(#g)"/>${spots}<circle cx="100" cy="100" r="72" fill="url(#f)" stroke="url(#au)" stroke-width="3.5"/><circle cx="100" cy="100" r="64" fill="none" stroke="url(#au)" stroke-width="1" stroke-dasharray="2 5"/>${inner}</svg>`
}

const medal = (i) => `<span class="medal m${i}">${i + 1}</span>`

const rowsDefault = (colours) =>
  players
    .map(
      ([name, balance, me], i) =>
        `<li class="${i < 3 ? 'top' : ''}">${i < 3 ? medal(i) : `<span class="pos">${i + 1}</span>`}<span class="who">${name}${me ? '<em>tu</em>' : ''}</span>${stack(balance, colours)}<b>${fmt(balance)}</b></li>`,
    )
    .join('')

const base = `*{box-sizing:border-box}html,body{margin:0}body{width:360px;height:780px;overflow:hidden;color:#f6f1dc}
.app{position:relative;height:780px;display:flex;flex-direction:column}
nav{position:absolute;left:0;right:0;bottom:0;display:flex;height:68px;padding:8px 2px 10px}
nav a{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#9cc7b1}
nav svg{width:23px;height:23px}nav span{font-size:9.8px;letter-spacing:-.01em;white-space:nowrap}
nav a.on{color:#f0c24b}ul{list-style:none;margin:0;padding:0}
.medal{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:14px;color:#2b2100;box-shadow:inset 0 0 0 2px #ffffff55,0 1px 3px #0008}
.m0{background:linear-gradient(135deg,#fbe9a6,#f0c24b 50%,#a97c1c)}.m1{background:linear-gradient(135deg,#f4f4f0,#c2c6c4 55%,#7f8785)}.m2{background:linear-gradient(135deg,#f0c6a0,#c98649 55%,#7c4a22)}
.pos{flex:none;width:30px;text-align:center;color:#9cc7b1;font-size:15px}
.who{flex:1;min-width:0;font-size:16.5px}.who em{font-style:normal;margin-left:7px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding:1px 7px;border-radius:99px;color:#2b2100;background:#f0c24b;vertical-align:2px}
.stackbox{flex:none;width:34px;display:grid;place-items:center}
li b{flex:none;min-width:62px;text-align:right;font-variant-numeric:lining-nums tabular-nums}`

const directions = {
  a: {
    name: 'Taula de feltre',
    css: `${face('playfair-display', 'Display', 700)}${face('playfair-display', 'Display', 700, 'italic')}${face('manrope', 'Text', 500)}${face('manrope', 'Text', 700)}${face('manrope', 'Text', 800)}
body{font-family:Text;font-weight:500;background:#073b2b}
.app{background-image:${noise(0.09)},radial-gradient(120% 60% at 50% -8%,#1b9a6d 0,#0d5439 46%,#073b2b 78%)}
header{display:flex;justify-content:space-between;align-items:center;padding:16px 18px 6px}
.logo{font:italic 700 24px Display;background:linear-gradient(100deg,#fbe9a6,#f0c24b 45%,#c8952b 70%,#fbe9a6);-webkit-background-clip:text;color:transparent}
.bal{display:flex;align-items:center;gap:6px;font-weight:800;color:#f0c24b;font-size:14px;padding:6px 12px;border-radius:99px;background:#05291ecc;border:1px solid #f0c24b55}
h1{font:700 31px Display;margin:12px 18px 0}
.sub{margin:3px 18px 14px;color:#9cc7b1;font-size:13.5px}
.rule{height:1px;margin:0 18px 12px;background:linear-gradient(90deg,#f0c24b,#f0c24b22)}
ul{padding:0 14px;display:flex;flex-direction:column;gap:7px}
li{display:flex;align-items:center;gap:11px;height:64px;padding:0 13px;border-radius:15px;background:linear-gradient(180deg,#ffffff12,#ffffff06);border:1px solid #ffffff1f;box-shadow:0 2px 6px #0003}
li.top{border-color:#f0c24b55}li b{font:700 20px Display;font-variant-numeric:lining-nums tabular-nums;color:#f0c24b}
nav{background:#04261bf2;border-top:1px solid #f0c24b44}`,
    body: (c) => `<div class="app"><header><span class="logo">♠ MarcOna</span><span class="bal">4.820</span></header><h1>Classificació</h1><p class="sub">6 jugadors · 14.420 marcones en joc</p><div class="rule"></div><ul>${rowsDefault(c)}</ul>${nav}</div>`,
    chips: ['#b3322c', '#f0c24b', '#116a49'],
  },
  b: {
    name: 'Saló privat',
    css: `${face('bodoni-moda', 'Display', 700)}${face('bodoni-moda', 'Display', 700, 'italic')}${face('bodoni-moda', 'Display', 500)}${face('jost', 'Text', 400)}${face('jost', 'Text', 500)}
body{font-family:Text;font-weight:400;background:#04201a}
.app{background-image:${noise(0.05)},radial-gradient(90% 42% at 50% 0,#0d5439 0,#062e24 58%,#031a15 100%)}
.app:before{content:"";position:absolute;inset:9px 9px 76px;border:1px solid #f0c24b66;outline:1px solid #f0c24b2e;outline-offset:3px;pointer-events:none}
header{text-align:center;padding:27px 0 0}
.logo{font:italic 700 27px Display;color:#f0c24b;letter-spacing:.01em}
.fan{display:block;margin:7px auto 0}
h1{font:500 15px Text;letter-spacing:.34em;text-transform:uppercase;text-align:center;margin:10px 0 2px;color:#f6f1dc}
.sub{margin:0 0 14px;color:#9cc7b1;font-size:13px;text-align:center;letter-spacing:.03em}
ul{padding:0 27px}
li{display:flex;align-items:center;gap:10px;height:66px;border-bottom:1px solid #f0c24b33}
li:last-child{border:0}
li b{font:700 25px Display;color:#f6f1dc}li.top b{color:#f0c24b}
.who{font-size:17px;letter-spacing:.02em}
.medal{border-radius:2px;transform:rotate(45deg) scale(.78);box-shadow:inset 0 0 0 1.5px #fff5}.medal{font-size:0}
.pos{font:500 17px Display}
nav{background:#031a15;border-top:1px solid #f0c24b66}nav span{font-size:10px;letter-spacing:0}`,
    body: (c) => `<div class="app"><header><span class="logo">♠ MarcOna</span><svg class="fan" width="92" height="12" viewBox="0 0 92 12" fill="none" stroke="#f0c24b" stroke-width=".9"><path d="M0 6h34M58 6h34M46 1l5 5-5 5-5-5 5-5Z"/></svg></header><h1>Classificació</h1><p class="sub">6 jugadors · 14.420 marcones</p><ul>${rowsDefault(c)}</ul>${nav}</div>`,
    chips: ['#f0c24b', '#a97c1c'],
  },
  c: {
    name: 'La fitxa',
    css: `${face('fraunces', 'Display', 700)}${face('fraunces', 'Display', 700, 'italic')}${face('fraunces', 'Display', 600)}${face('dm-sans', 'Text', 500)}${face('dm-sans', 'Text', 700)}
body{font-family:Text;font-weight:500;background:#073b2b}
.app{background-image:${noise(0.08)},radial-gradient(90% 40% at 50% 15%,#1f9e72 0,#116a49 40%,#073b2b 82%)}
header{display:flex;justify-content:space-between;align-items:center;padding:14px 18px 0}
.logo{font:italic 700 22px Display;color:#f0c24b}.hello{color:#9cc7b1;font-size:13px}
.hero{display:grid;place-items:center;margin:8px 0 2px;filter:drop-shadow(0 10px 14px #0007)}
.hero text{font-family:Display}
h1{font:700 21px Display;margin:6px 18px 8px;display:flex;justify-content:space-between;align-items:baseline}h1 small{font:500 12.5px Text;color:#9cc7b1}
ul{padding:0 14px;display:flex;flex-direction:column;gap:6px}
li{display:flex;align-items:center;gap:10px;height:53px;padding:0 15px 0 9px;border-radius:99px;background:#052b20c4;border:1px solid #ffffff1a}
li.top{background:linear-gradient(90deg,#f0c24b2b,#052b20c4 62%);border-color:#f0c24b66}
.stackbox{display:none}li b{font:700 18px Display;color:#f0c24b}.who{font-size:16px}
nav{left:10px;right:10px;bottom:8px;height:62px;padding:5px 0;border-radius:22px;background:#04261bf5;border:1px solid #f0c24b44;box-shadow:0 6px 16px #0008}nav span{font-size:9.4px}nav svg{width:21px;height:21px}`,
    body: (c) => `<div class="app"><header><span class="logo">♠ MarcOna</span><span class="hello">Hola, marc</span></header><div class="hero">${bigChip(150, '<text x="100" y="96" text-anchor="middle" font-size="35" font-weight="700" fill="#f0c24b">4.820</text><text x="100" y="120" text-anchor="middle" font-size="15" font-weight="600" fill="#f6f1dc">marcones</text>')}</div><h1>Classificació <small>6 jugadors</small></h1><ul>${rowsDefault(c)}</ul>${nav}</div>`,
    chips: ['#b3322c'],
  },
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 3 })
for (const [key, d] of Object.entries(directions)) {
  const html = `<!doctype html><html lang="ca"><head><meta charset="utf-8"><title>${d.name}</title><style>${base}${d.css}</style></head><body>${d.body(d.chips)}</body></html>`
  const file = join(here, `direction-${key}.html`)
  writeFileSync(file, html)
  await page.goto(pathToFileURL(file).href)
  await page.evaluate(() => document.fonts.ready)
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll('nav a')].filter((a) => a.querySelector('span').scrollWidth > a.clientWidth).map((a) => a.textContent),
  )
  console.log(key, d.name, 'tab labels overflowing:', overflow)
  await page.screenshot({ path: join(here, `direction-${key}.png`) })
}
await browser.close()
