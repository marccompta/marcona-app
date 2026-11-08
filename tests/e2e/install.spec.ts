import { expect, test, type Page } from '@playwright/test'
import { PNG } from 'pngjs'

// REQ-154: what a phone reads when someone adds the site to the home screen.
// Opening it full screen is up to the phone, so the review checks a real one.
const base = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:4173/marcona-app/')

type Manifest = {
  name: string
  short_name: string
  lang: string
  start_url: string
  scope: string
  display: string
  background_color: string
  theme_color: string
  icons: { src: string; sizes: string; type: string; purpose?: string }[]
}

async function manifest(page: Page) {
  await page.goto('')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const url = new URL(href!, page.url())
  const response = await page.request.get(url.href)
  expect(response.ok()).toBe(true)
  return { url, body: (await response.json()) as Manifest }
}

async function pngSize(page: Page, url: URL) {
  const response = await page.request.get(url.href)
  expect(response.ok(), url.href).toBe(true)
  expect(response.headers()['content-type']).toContain('image/png')
  const image = PNG.sync.read(await response.body())
  return `${image.width}x${image.height}`
}

test('REQ-154: the manifest opens the site full screen, under its own name', async ({ page }) => {
  const { url, body } = await manifest(page)

  expect(body.name).toBe('MarcOna')
  expect(body.short_name).toBe('MarcOna')
  expect(body.lang).toBe('ca')
  expect(body.display).toBe('standalone')
  expect(new URL(body.start_url, url).href).toBe(base.href)
  expect(new URL(body.scope, url).href).toBe(base.href)
  expect(body.theme_color).toBe('#073b2b')
  expect(body.background_color).toBe('#031a15')
})

test('REQ-154: every icon is a PNG of the size it claims, including one for any shape', async ({ page }) => {
  const { url, body } = await manifest(page)

  for (const icon of body.icons) {
    const src = new URL(icon.src, url)
    expect(src.pathname.startsWith(base.pathname), src.pathname).toBe(true)
    expect(await pngSize(page, src)).toBe(icon.sizes)
  }
  expect(body.icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
  expect(body.icons.some((icon) => icon.purpose === 'maskable')).toBe(true)
})

test('REQ-154: an iPhone gets its own icon, title and full screen', async ({ page }) => {
  await page.goto('')
  const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')
  expect(await pngSize(page, new URL(touchIcon!, page.url()))).toBe('180x180')
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes')
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute('content', 'yes')
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'MarcOna')
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute(
    'content',
    'black-translucent',
  )
})

test('REQ-154: the tab has an icon too', async ({ page }) => {
  await page.goto('')
  const href = await page.locator('link[rel="icon"]').getAttribute('href')
  const response = await page.request.get(new URL(href!, page.url()).href)
  expect(response.ok()).toBe(true)
})

test('REQ-154: Chromium reads the manifest with no errors', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Only Chromium reports this')
  await page.goto('')
  await page.locator('[data-screen]').waitFor()
  const session = await page.context().newCDPSession(page)
  const { url, errors, parsed } = await session.send('Page.getAppManifest')
  expect(url).toContain('/marcona-app/')
  expect(errors).toEqual([])
  expect(parsed).toBeTruthy()
})
