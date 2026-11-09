import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { admin, fakeSupabase, logIn, player } from './fake-supabase'

const users = [
  { ...admin, balance: 20 },
  { ...player, balance: 7 },
]
const movements = [{ username: 'anna', delta: 7, balance_after: 7, concept: 'Benvinguda, "anna"' }]

const startOnAdmin = async (page: Page) => {
  const calls = await fakeSupabase(page, users, movements)
  await logIn(page, admin)
  await page.getByRole('link', { name: 'Administració' }).click()
  await page.locator('[data-screen="administracio"]').waitFor()
  return calls
}

const download = async (page: Page, name: string) => {
  const started = page.waitForEvent('download')
  await page.getByRole('link', { name }).click()
  const file = await started
  return { name: file.suggestedFilename(), content: readFileSync(await file.path(), 'utf8') }
}

test.beforeEach(async ({ page }) => {
  await page.goto('')
})

test.describe('export', () => {
  test('REQ-164: the admin downloads everything as JSON, and the movements as CSV', async ({ page }) => {
    const calls = await startOnAdmin(page)
    await page.getByRole('button', { name: "Prepara l'exportació" }).click()
    await expect(page.getByRole('status')).toHaveText('Ja pots baixar els fitxers.')
    expect(calls.exports).toBe(1)

    const json = await download(page, 'Baixa-ho tot (JSON)')
    expect(json.name).toMatch(/^marcona-\d{4}-\d{2}-\d{2}-\d{4}\.json$/)
    const dump = JSON.parse(json.content)
    expect(dump.users.map((user: { username: string }) => user.username).sort()).toEqual(['anna', 'marc'])
    expect(dump.ledger).toHaveLength(1)
    expect(dump.users[0]).not.toHaveProperty('password')

    const csv = await download(page, 'Baixa els moviments (CSV)')
    expect(csv.name).toMatch(/^marcona-moviments-\d{4}-\d{2}-\d{2}-\d{4}\.csv$/)
    expect(csv.content.split('\r\n')[1]).toContain('anna,7,7,admin_adjustment,"Benvinguda, ""anna"""')
  })

  test('REQ-164: nothing is offered for download before the export is ready', async ({ page }) => {
    const calls = await startOnAdmin(page)
    expect(await page.getByRole('link', { name: 'Baixa-ho tot (JSON)' }).count()).toBe(0)
    expect(calls.exports).toBe(0)
  })
})

test.describe('wipe', () => {
  const wipeButton = (page: Page) => page.getByRole('button', { name: 'Esborra-ho tot' })

  test('REQ-165: after typing the word, only the admin remains, at 0 marcones', async ({ page }) => {
    const calls = await startOnAdmin(page)
    await page.getByLabel('Escriu ESBORRA per confirmar').fill('ESBORRA')
    await wipeButton(page).click()

    await expect(page.getByRole('status')).toHaveText("S'han esborrat 1 usuari, 0 esdeveniments i 1 moviment.")
    expect(calls.wipes).toEqual(['ESBORRA'])
    await expect(page.locator('.admin-row')).toHaveCount(1)
    await expect(page.getByRole('button', { name: /^marc/ })).toContainText('0 marcones')
    await expect(page.getByLabel('Escriu ESBORRA per confirmar')).toHaveValue('')
  })

  test('REQ-166: without the exact word, the button stays off and nothing is sent', async ({ page }) => {
    const calls = await startOnAdmin(page)
    for (const word of ['', 'esborra', 'ESBORR', 'ESBORRA ', 'Esborra']) {
      await page.getByLabel('Escriu ESBORRA per confirmar').fill(word)
      expect(await wipeButton(page).isDisabled(), word).toBe(true)
      await page.getByLabel('Escriu ESBORRA per confirmar').press('Enter')
    }
    expect(calls.wipes).toEqual([])
    await expect(page.locator('.admin-row')).toHaveCount(2)
  })

  test("REQ-166: with the word typed, the keyboard's Enter key sends nothing", async ({ page }) => {
    const calls = await startOnAdmin(page)
    await page.getByLabel('Escriu ESBORRA per confirmar').fill('ESBORRA')
    await page.getByLabel('Escriu ESBORRA per confirmar').press('Enter')
    await page.waitForTimeout(500)
    expect(calls.wipes).toEqual([])
    expect(await page.locator('.admin-row').count()).toBe(2)
  })

  test('REQ-166: a refusal from the server shows in Catalan', async ({ page }) => {
    await startOnAdmin(page)
    await page.route('**/rest/v1/rpc/admin_wipe', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'P0001', message: 'wipe_not_confirmed', details: null, hint: null }),
      }),
    )
    await page.getByLabel('Escriu ESBORRA per confirmar').fill('ESBORRA')
    await wipeButton(page).click()
    await expect(page.getByRole('alert')).toHaveText('Escriu ESBORRA exactament, en majúscules, per confirmar.')
    await expect(page.locator('.admin-row')).toHaveCount(2)
  })
})

test.describe('lock', () => {
  test('REQ-168: the first tap only asks, and cancelling changes nothing', async ({ page }) => {
    const calls = await startOnAdmin(page)
    await page.getByRole('button', { name: "Bloqueja l'esborrat" }).click()
    await expect(page.getByText('Segur? No es podrà desbloquejar.')).toBeVisible()
    expect(calls.wipeLocked).toBe(false)
    await page.getByRole('button', { name: 'No, cancel·la' }).click()
    expect(calls.wipeLocked).toBe(false)
    await expect(page.getByLabel('Escriu ESBORRA per confirmar')).toBeVisible()
  })

  test('REQ-168: once locked, the wipe is gone from the screen, even after a reload', async ({ page }) => {
    const calls = await startOnAdmin(page)
    await page.getByRole('button', { name: "Bloqueja l'esborrat" }).click()
    await page.getByRole('button', { name: 'Sí, bloqueja' }).click()

    await expect(page.locator('[data-wipe-locked]')).toHaveText("L'esborrat està bloquejat per a l'esdeveniment.")
    expect(calls.wipeLocked).toBe(true)
    expect(await page.getByLabel('Escriu ESBORRA per confirmar').count()).toBe(0)
    expect(await page.getByRole('button', { name: "Bloqueja l'esborrat" }).count()).toBe(0)

    await page.reload()
    await expect(page.locator('[data-wipe-locked]')).toBeVisible()
    expect(await page.getByLabel('Escriu ESBORRA per confirmar').count()).toBe(0)
  })

  test('REQ-168: a wipe locked from another phone is refused, and the screen catches up', async ({ page }) => {
    const calls = await startOnAdmin(page)
    // The panel has read the lock as open before another phone closes it.
    await page.getByLabel('Escriu ESBORRA per confirmar').waitFor()
    calls.wipeLocked = true
    await page.getByLabel('Escriu ESBORRA per confirmar').fill('ESBORRA')
    await page.getByRole('button', { name: 'Esborra-ho tot' }).click()

    await expect(page.locator('[data-wipe-locked]')).toBeVisible()
    expect(calls.wipes).toEqual(['ESBORRA'])
    await expect(page.locator('.admin-row')).toHaveCount(2)
  })
})
