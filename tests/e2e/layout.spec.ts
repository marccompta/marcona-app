import { expect, test, type Page } from '@playwright/test'
import { admin, fakeSupabase, logIn } from './fake-supabase'

const screens = ['classificacio', 'esdeveniments', 'ruleta', 'auditoria', 'administracio']

const noSidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

// Controls smaller than the tap size, ignoring anything that isn't on screen.
const smallTargets = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('a, button, input')]
      .map((element) => ({ element, box: element.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && (box.width < 44 || box.height < 44))
      .map(({ element, box }) => `${element.tagName} ${element.textContent} ${box.width}x${box.height}`),
  )

test.describe('at 360px wide', () => {
  test('REQ-023, REQ-024: the login fits and has big enough targets', async ({ page }) => {
    await page.goto('')
    await page.locator('[data-screen="login"]').waitFor()
    expect(await noSidewaysScroll(page)).toBe(true)
    expect(await smallTargets(page)).toEqual([])
  })

  test('REQ-023, REQ-024: every screen fits and has big enough targets', async ({ page }) => {
    await fakeSupabase(page)
    await page.goto('')
    await logIn(page, admin)

    for (const name of screens) {
      await page.goto(`#/${name}`)
      await page.locator(`[data-screen="${name}"]`).waitFor()
      expect(await noSidewaysScroll(page), name).toBe(true)
      expect(await smallTargets(page), name).toEqual([])
    }
  })

  test('REQ-012: no tab label is cut off, and five tabs fit', async ({ page }) => {
    await fakeSupabase(page)
    await page.goto('')
    await logIn(page, admin)
    await page.evaluate(() => document.fonts.ready)

    const overflowing = await page.evaluate(() =>
      [...document.querySelectorAll('.tab')]
        .filter((tab) => tab.querySelector('span')!.scrollWidth > tab.clientWidth)
        .map((tab) => tab.textContent),
    )
    expect(overflowing).toEqual([])
    await expect(page.getByRole('navigation').getByRole('link')).toHaveCount(5)
  })

  test('REQ-012: the tab bar stays put while the screen scrolls', async ({ page }) => {
    await fakeSupabase(page)
    await page.setViewportSize({ width: 360, height: 420 })
    await page.goto('')
    await logIn(page, admin)

    const bar = page.getByRole('navigation')
    const before = await bar.boundingBox()
    const scrolled = await page.evaluate(() => {
      const scroller = document.querySelector('.scroller')!
      scroller.scrollTop = 200
      return scroller.scrollTop
    })

    expect(scrolled).toBeGreaterThan(0)
    expect(await bar.boundingBox()).toEqual(before)
    expect(before!.y + before!.height).toBe(420)
  })
})

test('REQ-027: on a desktop the layout stays a readable column', async ({ page }) => {
  await fakeSupabase(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('')
  await logIn(page, admin)

  const box = await page.locator('.table').boundingBox()
  expect(box!.width).toBeLessThanOrEqual(480)
  expect(box!.x).toBeGreaterThan(300)
  expect(await noSidewaysScroll(page)).toBe(true)
})
