import { expect, test } from '@playwright/test'
import { admin, fakeSupabase, logIn, player } from './fake-supabase'

test.beforeEach(async ({ page }) => {
  await page.goto('')
})

test('REQ-003: a correct login shows the ranking', async ({ page }) => {
  await fakeSupabase(page)
  await logIn(page, admin)
  await expect(page).toHaveURL(/#\/classificacio$/)
})

test('REQ-003: a login from a deep link still lands on the ranking', async ({ page }) => {
  await fakeSupabase(page)
  await page.goto('#/ruleta')
  await logIn(page, admin)
  await expect(page).toHaveURL(/#\/classificacio$/)
})

test('REQ-004: asks only for a username and a password', async ({ page }) => {
  const calls = await fakeSupabase(page)
  await expect(page.locator('form input')).toHaveCount(2)
  await logIn(page, admin)
  expect(calls.logins).toEqual(['marc@marcona.invalid'])
})

test('REQ-004: the hidden email never reaches the interface', async ({ page }) => {
  await fakeSupabase(page)
  await logIn(page, admin)
  await expect(page.locator('body')).not.toContainText('marcona.invalid')
  await expect(page.locator('body')).not.toContainText('@')
})

test('REQ-005, REQ-019: a wrong password stays on login with a Catalan error', async ({ page }) => {
  await fakeSupabase(page)
  await page.getByLabel("Nom d'usuari").fill(admin.username)
  await page.getByLabel('Contrasenya').fill('no-es-aquesta')
  await page.getByRole('button', { name: 'Entra' }).click()

  await expect(page.getByRole('alert')).toHaveText("El nom d'usuari o la contrasenya no són correctes.")
  await expect(page.locator('[data-screen="login"]')).toBeVisible()
  await expect(page.locator('body')).not.toContainText('Invalid')
})

test('REQ-005: an impossible username fails the same way, with no request', async ({ page }) => {
  const calls = await fakeSupabase(page)
  await page.getByLabel("Nom d'usuari").fill('a@b')
  await page.getByLabel('Contrasenya').fill('qualsevol')
  await page.getByRole('button', { name: 'Entra' }).click()

  await expect(page.getByRole('alert')).toHaveText("El nom d'usuari o la contrasenya no són correctes.")
  expect(calls.logins).toEqual([])
})

test('REQ-005: empty fields ask for both', async ({ page }) => {
  const calls = await fakeSupabase(page)
  await page.getByRole('button', { name: 'Entra' }).click()
  await expect(page.getByRole('alert')).toHaveText("Escriu el nom d'usuari i la contrasenya.")
  expect(calls.logins).toEqual([])
})

test('REQ-019: a dropped connection shows Catalan', async ({ page }) => {
  await page.route('**/auth/v1/token**', (route) => route.abort())
  await page.getByLabel("Nom d'usuari").fill(admin.username)
  await page.getByLabel('Contrasenya').fill(admin.password)
  await page.getByRole('button', { name: 'Entra' }).click()
  await expect(page.getByRole('alert')).toHaveText('No hi ha connexió. Comprova la xarxa i torna-ho a provar.')
})

test('REQ-006: a reload keeps the session', async ({ page }) => {
  await fakeSupabase(page)
  await logIn(page, admin)
  await page.reload()
  await expect(page.locator('[data-screen="classificacio"]')).toBeVisible()
})

test('REQ-007: logging out ends the session and shows login', async ({ page }) => {
  const calls = await fakeSupabase(page)
  await logIn(page, admin)
  await page.getByRole('button', { name: 'Tanca la sessió' }).click()

  await expect(page.locator('[data-screen="login"]')).toBeVisible()
  expect(calls.logouts).toBe(1)
  await page.reload()
  await expect(page.locator('[data-screen="login"]')).toBeVisible()
})

test('REQ-007: logging out works with no connection', async ({ page }) => {
  await fakeSupabase(page)
  await logIn(page, admin)
  await page.route('**/auth/v1/logout**', (route) => route.abort())
  await page.getByRole('button', { name: 'Tanca la sessió' }).click()

  await expect(page.locator('[data-screen="login"]')).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-screen="login"]')).toBeVisible()
})

test('REQ-019: a logged-in user with no profile gets a Catalan message and a way out', async ({ page }) => {
  await fakeSupabase(page, [{ ...admin, username: 'orfe' }])
  await page.route('**/rest/v1/profiles**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: 'null' }),
  )
  await page.getByLabel("Nom d'usuari").fill('orfe')
  await page.getByLabel('Contrasenya').fill(admin.password)
  await page.getByRole('button', { name: 'Entra' }).click()

  await expect(page.getByRole('alert')).toHaveText("No hem trobat el teu perfil. Avisa l'administrador.")
  await page.getByRole('button', { name: 'Tanca la sessió' }).click()
  await expect(page.locator('[data-screen="login"]')).toBeVisible()
})

test('REQ-013: a player has no Administració tab, nor the screen', async ({ page }) => {
  await fakeSupabase(page)
  await logIn(page, player)
  await expect(page.getByRole('link', { name: 'Administració' })).toHaveCount(0)
  await page.goto('#/administracio')
  await expect(page.locator('[data-screen="classificacio"]')).toBeVisible()
})

test('REQ-013: the admin has the Administració tab', async ({ page }) => {
  await fakeSupabase(page)
  await logIn(page, admin)
  await page.getByRole('link', { name: 'Administració' }).click()
  await expect(page.locator('[data-screen="administracio"]')).toBeVisible()
})
