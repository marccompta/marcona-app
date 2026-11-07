import { expect, test } from '@playwright/test'
import { admin, fakeSupabase, logIn, player, type FakeMovement, type FakeUser } from './fake-supabase'

const removed: FakeUser = { username: 'gone', password: 'x', role: 'player', removed: true }
const history: FakeMovement[] = [
  { username: 'anna', delta: 10, balance_after: 10, concept: 'Benvinguda', created_at: '2026-11-06T18:30:00Z' },
  { username: 'gone', delta: 1, balance_after: 1, concept: 'Abans de marxar', created_at: '2026-11-06T18:40:00Z' },
  { username: 'marc', delta: 5, balance_after: 5, concept: 'Regal', created_at: '2026-11-06T18:50:00Z' },
  { username: 'anna', delta: -4, balance_after: 6, concept: 'Correcció', created_at: '2026-11-06T19:00:00Z' },
]

const rows = '[data-movement]'

test.beforeEach(async ({ page }) => {
  await page.goto('')
  await fakeSupabase(page, [admin, player, removed], history)
  await logIn(page, player)
  await page.getByRole('link', { name: 'Auditoria' }).click()
  await page.locator(rows).first().waitFor()
})

test('REQ-067: shows all movements, newest first', async ({ page }) => {
  await expect(page.locator('.movement-label')).toHaveText(['Correcció', 'Regal', 'Abans de marxar', 'Benvinguda'])
})

test('REQ-069: each row shows who, the amount, the concept, the balance after and the time', async ({ page }) => {
  const newest = page.locator(rows).first()
  await expect(newest.locator('.movement-who')).toHaveText('anna')
  await expect(newest.locator('.delta')).toHaveText('-4')
  await expect(newest.locator('.movement-label')).toHaveText('Correcció')
  await expect(newest.locator('.movement-after')).toHaveText('Saldo: 6 marcones')
  await expect(newest.locator('time')).toHaveText('6 de nov., 20:00')
})

test('REQ-068: filtering by a person shows only their movements', async ({ page }) => {
  await page.getByLabel('Persona').selectOption({ label: 'anna' })
  await expect(page.locator('.movement-label')).toHaveText(['Correcció', 'Benvinguda'])

  await page.getByLabel('Persona').selectOption({ label: 'Tothom' })
  await expect(page.locator(rows)).toHaveCount(4)
})

test('REQ-051: a removed person keeps their history and stays in the filter', async ({ page }) => {
  await expect(page.locator(rows).filter({ hasText: 'Abans de marxar' })).toHaveCount(1)
  await page.getByLabel('Persona').selectOption({ label: 'gone (de baixa)' })
  await expect(page.locator('.movement-label')).toHaveText(['Abans de marxar'])
})

test('REQ-067: someone with no movements gets a Catalan message', async ({ page }) => {
  await page.getByRole('link', { name: 'Classificació' }).click()
  await page.getByRole('link', { name: 'Auditoria' }).click()
  await page.route('**/rest/v1/ledger**', (route) =>
    route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: '[]' }),
  )
  await page.reload()
  await expect(page.locator('[data-screen="auditoria"]')).toContainText('Encara no hi ha cap moviment.')
})

test('REQ-019: a failed load shows Catalan', async ({ page }) => {
  await page.route('**/rest/v1/ledger**', (route) =>
    route.fulfill({
      status: 500,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'application/json',
      body: JSON.stringify({ code: 'XX000', message: 'Something broke' }),
    }),
  )
  await page.reload()
  await expect(page.getByRole('alert')).toHaveText('Alguna cosa ha fallat. Torna-ho a provar.')
})
