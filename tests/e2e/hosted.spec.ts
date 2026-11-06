import { existsSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { callAdminUsers } from '../../src/lib/adminUsers'
import { adminClient, adminLogin, createTestAccount, signOutAll } from '../hosted/env'

// The whole path with no fake: this browser, the real project, the real admin.
// It needs .env.test.local, so it only runs on the human's machine.
test.skip(!existsSync('.env.test.local'), 'Needs .env.test.local')

const ranking = '[data-screen="classificacio"]'
const login = '[data-screen="login"]'

test('REQ-003, REQ-006, REQ-007: log in, reload and log out for real', async ({ page }) => {
  const { username, password } = adminLogin()
  await page.goto('')

  await page.getByLabel("Nom d'usuari").fill(username)
  await page.getByLabel('Contrasenya').fill(password)
  await page.getByRole('button', { name: 'Entra' }).click()

  await expect(page.locator(ranking)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Administració' })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('marcona.invalid')

  await page.reload()
  await expect(page.locator(ranking)).toBeVisible()

  await page.getByRole('button', { name: 'Tanca la sessió' }).click()
  await expect(page.locator(login)).toBeVisible()
  await page.reload()
  await expect(page.locator(login)).toBeVisible()
})

test('REQ-005, REQ-019: a real wrong password shows Catalan', async ({ page }) => {
  await page.goto('')
  await page.getByLabel("Nom d'usuari").fill(adminLogin().username)
  await page.getByLabel('Contrasenya').fill('no-es-aquesta')
  await page.getByRole('button', { name: 'Entra' }).click()

  await expect(page.getByRole('alert')).toHaveText("El nom d'usuari o la contrasenya no són correctes.")
  await expect(page.locator(login)).toBeVisible()
})

test.afterAll(signOutAll)

async function logInInBrowser(page: Page, username: string, password: string) {
  await page.goto('')
  await page.getByLabel("Nom d'usuari").fill(username)
  await page.getByLabel('Contrasenya').fill(password)
  await page.getByRole('button', { name: 'Entra' }).click()
  await expect(page.locator(ranking)).toBeVisible()
}

test('REQ-045: a real reset sends a logged-in phone back to the login', async ({ page }, info) => {
  const user = await createTestAccount(`r-${info.project.name.slice(0, 3)}`)
  await logInInBrowser(page, user.username, user.password)

  await callAdminUsers(await adminClient(), { action: 'reset', userId: user.userId, password: 'una-altra-contrasenya-2' })

  await page.reload()
  await expect(page.locator(login)).toBeVisible()
})

test('REQ-048, REQ-049: a real removal sends a logged-in phone back to the login, for good', async ({ page }, info) => {
  const user = await createTestAccount(`b-${info.project.name.slice(0, 3)}`)
  await logInInBrowser(page, user.username, user.password)

  await callAdminUsers(await adminClient(), { action: 'remove', userId: user.userId })

  await page.reload()
  await expect(page.locator(login)).toBeVisible()

  await page.getByLabel("Nom d'usuari").fill(user.username)
  await page.getByLabel('Contrasenya').fill(user.password)
  await page.getByRole('button', { name: 'Entra' }).click()
  await expect(page.getByRole('alert')).toHaveText('Aquest compte ja no està actiu.')
})
