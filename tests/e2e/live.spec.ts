import { expect, test, type Page } from '@playwright/test'
import { admin, fakeSupabase, logIn, player, type FakeMovement, type FakeUser } from './fake-supabase'

// Live updates through the fake Realtime socket. Each test marks the page first,
// so a reload would lose the mark and fail the check at the end.
const bea: FakeUser = { username: 'bea', password: 'x', role: 'player', balance: 30 }
const people: FakeUser[] = [{ ...admin, balance: 50 }, { ...player, balance: 20 }, bea]
const history: FakeMovement[] = [{ username: 'anna', delta: 20, balance_after: 20, concept: 'Benvinguda' }]

const markPage = (page: Page) => page.evaluate(() => ((window as unknown as { stayed: boolean }).stayed = true))
const stayed = (page: Page) => page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed === true)

async function joined(calls: Awaited<ReturnType<typeof fakeSupabase>>, table: string) {
  await expect.poll(() => calls.channels.some((channel) => !channel.left && channel.tables.includes(table))).toBe(true)
}

test.beforeEach(async ({ page }) => {
  await page.goto('')
})

test('REQ-150: the ranking moves when someone else changes a balance', async ({ page }) => {
  const calls = await fakeSupabase(page, people, history)
  await logIn(page, player)
  await joined(calls, 'profiles')
  await expect(page.locator('.rank-username')).toHaveText(['marc', 'bea', 'anna'])
  await markPage(page)

  calls.adjustAs('anna', 40)

  await expect(page.locator('.rank-username')).toHaveText(['anna', 'marc', 'bea'])
  await expect(page.locator('[data-rank="1"] .rank-amount')).toHaveText('60')
  expect(await stayed(page)).toBe(true)
})

test('REQ-151: the audit shows a new movement when it happens', async ({ page }) => {
  const calls = await fakeSupabase(page, people, history)
  await logIn(page, player)
  await page.getByRole('link', { name: 'Auditoria' }).click()
  await joined(calls, 'ledger')
  await expect(page.locator('[data-movement]')).toHaveCount(1)
  await markPage(page)

  calls.adjustAs('bea', 5, 'Ronda de cafès')

  await expect(page.locator('[data-movement]')).toHaveCount(2)
  await expect(page.locator('.movement-label').first()).toHaveText('Ronda de cafès')
  expect(await stayed(page)).toBe(true)
})

test('REQ-151: the audit filter keeps its choice when a movement arrives', async ({ page }) => {
  const calls = await fakeSupabase(page, people, history)
  await logIn(page, player)
  await page.getByRole('link', { name: 'Auditoria' }).click()
  await joined(calls, 'ledger')
  await page.getByLabel('Persona').selectOption({ label: 'bea' })
  await expect(page.locator('[data-movement]')).toHaveCount(0)

  calls.adjustAs('bea', 5, 'Per a la bea')
  calls.adjustAs('anna', 1, 'Per a l’anna')

  await expect(page.locator('.movement-label')).toHaveText(['Per a la bea'])
  await expect(page.getByLabel('Persona')).toHaveValue('bea')
})

test('REQ-150, REQ-151: a person’s balance and movements follow along', async ({ page }) => {
  const calls = await fakeSupabase(page, people, history)
  await logIn(page, player)
  await page.getByRole('link', { name: /anna/ }).click()
  await joined(calls, 'ledger')
  await expect(page.locator('.detail-amount')).toHaveText('20')
  await markPage(page)

  calls.adjustAs('anna', -5, 'Correcció')

  await expect(page.locator('.detail-amount')).toHaveText('15')
  await expect(page.locator('[data-movement]')).toHaveCount(2)
  expect(await stayed(page)).toBe(true)
})

test('REQ-150: a change missed while the connection was down shows when the phone wakes', async ({ page }) => {
  const calls = await fakeSupabase(page, people, history)
  await logIn(page, player)
  await joined(calls, 'profiles')
  // Subscribing reads once more. Let that finish before the connection drops.
  await page.waitForTimeout(500)
  calls.live = false
  calls.adjustAs('anna', 100)
  await page.waitForTimeout(500)
  expect(await page.locator('[data-rank="1"] .rank-username').textContent()).toBe('marc')

  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))

  await expect(page.locator('[data-rank="1"] .rank-username')).toHaveText('anna')
})

test('REQ-150: a screen stops listening once it closes', async ({ page }) => {
  const calls = await fakeSupabase(page, people, history)
  await logIn(page, player)
  await joined(calls, 'profiles')
  await page.getByRole('link', { name: 'Ruleta' }).click()
  await page.locator('[data-screen="ruleta"]').waitFor()

  await expect.poll(() => calls.channels.filter((channel) => !channel.left)).toEqual([])
})
