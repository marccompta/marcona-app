import { expect, test } from '@playwright/test'
import { admin, fakeSupabase, logIn } from './fake-supabase'

const base = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:4173/marcona-app/')

test('REQ-001: every asset loads under the base path', async ({ page }) => {
  const failed: string[] = []
  const outside: string[] = []
  page.on('requestfailed', (request) => failed.push(request.url()))
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push(response.url())
    const url = new URL(response.url())
    if (url.origin === base.origin && !url.pathname.startsWith(base.pathname)) outside.push(url.pathname)
  })

  await page.goto('')
  await expect(page.locator('[data-screen]')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)

  expect(failed).toEqual([])
  expect(outside).toEqual([])
})

test('REQ-002: reloading a screen, or opening a link to it, shows that screen', async ({ page }) => {
  await fakeSupabase(page)
  await page.goto('')
  await logIn(page, admin)

  for (const route of ['esdeveniments', 'ruleta', 'auditoria', 'administracio', 'classificacio']) {
    await page.goto(`#/${route}`)
    await expect(page.locator(`[data-screen="${route}"]`)).toBeVisible()
    await page.reload()
    await expect(page.locator(`[data-screen="${route}"]`)).toBeVisible()
  }
})

test('REQ-015: the document is in Catalan', async ({ page }) => {
  await page.goto('')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ca')
  await expect(page).toHaveTitle('MarcOna')
})

test('REQ-022: every font comes from the site itself', async ({ page }) => {
  const fonts: string[] = []
  page.on('response', (response) => {
    if (response.request().resourceType() === 'font') fonts.push(response.url())
  })

  await page.goto('')
  await expect(page.locator('[data-screen]')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)

  await expect.poll(() => fonts.length).toBeGreaterThan(0)
  for (const font of fonts) expect(new URL(font).origin).toBe(base.origin)
})
