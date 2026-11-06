import { expect, test } from '@playwright/test'
import { admin, fakeSupabase, logIn, type FakeMovement, type FakeUser } from './fake-supabase'

const you: FakeUser = { ...admin, username: 'zoe', balance: 50 }
const table: FakeUser[] = [
  { username: 'bea', password: 'x', role: 'player', balance: 20 },
  you,
  { username: 'anna', password: 'x', role: 'player', balance: 20 },
  { username: 'pau', password: 'x', role: 'player', balance: 3 },
  { username: 'gone', password: 'x', role: 'player', balance: 999, removed: true },
]
const history: FakeMovement[] = [
  { username: 'anna', delta: 25, balance_after: 25, concept: 'Benvinguda' },
  { username: 'bea', delta: 20, balance_after: 20, concept: 'Per a una altra persona' },
  { username: 'anna', delta: -5, balance_after: 20, concept: 'Correcció' },
]

test.beforeEach(async ({ page }) => {
  await page.goto('')
})

test('REQ-050, REQ-063, REQ-064: active users by balance, then alphabetically', async ({ page }) => {
  await fakeSupabase(page, table)
  await logIn(page, you)
  await expect(page.locator('.rank-username')).toHaveText(['zoe', 'anna', 'bea', 'pau'])
  await expect(page.locator('.rank-amount')).toHaveText(['50', '20', '20', '3'])
})

test('REQ-065: the top three places have medals, and the rest a number', async ({ page }) => {
  await fakeSupabase(page, table)
  await logIn(page, you)
  await expect(page.locator('[data-medal]')).toHaveCount(3)
  await expect(page.locator('[data-rank="1"] [data-medal="gold"]')).toBeVisible()
  await expect(page.locator('[data-rank="2"] [data-medal="silver"]')).toBeVisible()
  await expect(page.locator('[data-rank="3"] [data-medal="bronze"]')).toBeVisible()
  await expect(page.locator('[data-rank="4"] .place')).toHaveText('4')
})

test('REQ-063: my own row says so', async ({ page }) => {
  await fakeSupabase(page, table)
  await logIn(page, you)
  await expect(page.locator('.you')).toHaveCount(1)
  await expect(page.locator('[data-rank="1"] .you')).toBeVisible()
})

test('REQ-011: the empty state shows while nobody else is active', async ({ page }) => {
  await fakeSupabase(page, [you, { username: 'gone', password: 'x', role: 'player', removed: true }])
  await logIn(page, you)
  await expect(page.getByRole('heading', { name: 'La taula està buida' })).toBeVisible()
})

test('REQ-066: tapping someone shows their balance and every movement on it', async ({ page }) => {
  await fakeSupabase(page, table, history)
  await logIn(page, you)
  await page.getByRole('link', { name: /anna/ }).click()

  await expect(page).toHaveURL(/#\/classificacio\/anna$/)
  await expect(page.getByRole('heading', { name: 'anna' })).toBeVisible()
  await expect(page.locator('.detail-amount')).toHaveText('20')
  await expect(page.locator('[data-movement]')).toHaveCount(2)
  await expect(page.locator('[data-movement]').first()).toContainText('Correcció')
  await expect(page.locator('body')).not.toContainText('Per a una altra persona')

  await page.getByRole('link', { name: 'Classificació' }).first().click()
  await expect(page.locator('[data-screen="classificacio"]')).toBeVisible()
})

test('REQ-002, REQ-066: a person has their own address, which survives a reload', async ({ page }) => {
  await fakeSupabase(page, table, history)
  await logIn(page, you)
  await page.goto('#/classificacio/anna')
  await page.reload()
  await expect(page.locator('.detail-amount')).toHaveText('20')
})

test('REQ-066: an unknown person gets a Catalan message', async ({ page }) => {
  await fakeSupabase(page, table)
  await logIn(page, you)
  await page.goto('#/classificacio/ningu')
  await expect(page.locator('[data-screen="usuari"]')).toContainText('No hem trobat aquest compte.')
})

test('REQ-070: balances show as chip stacks, and bigger balances stack higher', async ({ page }) => {
  await fakeSupabase(page, [
    you,
    { username: 'rica', password: 'x', role: 'player', balance: 5000 },
    { username: 'pobra', password: 'x', role: 'player', balance: 0 },
  ])
  await logIn(page, you)
  const chips = (rank: number) => page.locator(`[data-rank="${rank}"] .chips`).getAttribute('data-chips')

  await expect(page.locator('.rank-row .chips')).toHaveCount(3)
  expect(Number(await chips(1))).toBeGreaterThan(Number(await chips(2)))
  expect(await chips(3)).toBe('0')
})

test('REQ-070: the number counts up to the balance', async ({ page }) => {
  await fakeSupabase(page, [you, { username: 'rica', password: 'x', role: 'player', balance: 5000 }])
  await page.getByLabel("Nom d'usuari").fill(you.username)
  await page.getByLabel('Contrasenya').fill(you.password)
  await page.getByRole('button', { name: 'Entra' }).click()

  const amount = page.locator('[data-rank="1"] .count')
  await amount.waitFor()
  const first = await amount.textContent()
  expect(first).not.toBe('5.000')
  await expect(amount).toHaveText('5.000')
  await expect(amount).toHaveAttribute('aria-label', '5.000')
})

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('REQ-070: the number appears straight away', async ({ page }) => {
    await fakeSupabase(page, [you, { username: 'rica', password: 'x', role: 'player', balance: 5000 }])
    await logIn(page, you)
    await expect(page.locator('[data-rank="1"] .count')).toHaveText('5.000', { timeout: 200 })
  })
})

test('REQ-023: the longest username and a big balance still fit at 360px', async ({ page }) => {
  await fakeSupabase(page, [you, { username: 'x'.repeat(20), password: 'x', role: 'player', balance: 1234567 }], [
    { username: 'x'.repeat(20), delta: 1234567, balance_after: 1234567, concept: 'Un concepte força llarg per provar com es parteix' },
  ])
  await logIn(page, you)

  for (const address of ['#/classificacio', `#/classificacio/${'x'.repeat(20)}`, '#/auditoria']) {
    await page.goto(address)
    await page.locator('.rank-amount, [data-movement]').first().waitFor()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), address).toBe(true)
  }
})
