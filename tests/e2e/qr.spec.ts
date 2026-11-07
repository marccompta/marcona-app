import { expect, test } from '@playwright/test'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'
import { config } from '../../src/config'
import { admin, fakeSupabase, logIn, player } from './fake-supabase'

const qr = '[data-screen="qr"] [data-qr] svg'

test.beforeEach(async ({ page }) => {
  await page.goto('')
  await fakeSupabase(page)
})

test('REQ-153: the admin opens a QR code that a phone camera reads as the site', async ({ page }) => {
  await logIn(page, admin)
  await page.getByRole('link', { name: 'Administració' }).click()
  await page.getByRole('link', { name: 'Codi QR per entrar' }).click()

  await expect(page).toHaveURL(/#\/administracio\/qr$/)
  await expect(page.getByRole('heading', { name: 'Escaneja per entrar' })).toBeVisible()
  await expect(page.locator(qr)).toBeVisible()

  // What a camera would see: the code as drawn on the screen.
  const image = PNG.sync.read(await page.locator('[data-qr]').screenshot())
  const read = jsQR(new Uint8ClampedArray(image.data), image.width, image.height)
  expect(read?.data).toBe(config.siteUrl)
  await expect(page.locator('[data-screen="qr"]')).toContainText(config.siteUrl)
})

test('REQ-153: the code is big enough to scan across a table, and fits the phone', async ({ page }) => {
  await logIn(page, admin)
  await page.goto('#/administracio/qr')
  const box = (await page.locator(qr).boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(260)
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(360)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
})

test('REQ-153: a player has no QR screen', async ({ page }) => {
  await logIn(page, player)
  await page.goto('#/administracio/qr')
  await expect(page.locator('[data-screen="classificacio"]')).toBeVisible()
  await expect(page.locator('[data-screen="qr"]')).toHaveCount(0)
})

test('REQ-153: the site address is the one GitHub Pages serves', () => {
  expect(config.siteUrl).toBe('https://marccompta.github.io/marcona-app/')
})
