import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { adjustBalance } from '../../src/lib/data'
import { adminClient, createTestAccount, signOutAll, type TestAccount } from '../hosted/env'

// REQ-100: the main flows on a phone-sized screen, on the real project, with no
// fake. Each later slice extends this. It needs .env.test.local, so it only runs
// on the human's machine, against the local build or E2E_BASE_URL.
test.skip(!existsSync('.env.test.local'), 'Needs .env.test.local')

test.afterAll(signOutAll)

async function logIn(page: Page, user: TestAccount) {
  await page.goto('')
  await page.getByLabel("Nom d'usuari").fill(user.username)
  await page.getByLabel('Contrasenya').fill(user.password)
  await page.getByRole('button', { name: 'Entra' }).click()
  // Chromium has been seen to send nothing for over 5 seconds on a cold start.
  await expect(page.locator('[data-screen="classificacio"]')).toBeVisible({ timeout: 20000 })
}

async function give(user: TestAccount, amount: number) {
  await adjustBalance(
    { requestId: randomUUID(), userId: user.userId, action: 'add', amount, concept: 'Prova de fum' },
    await adminClient(),
  )
}

test('REQ-100: logs in, creates an event, accepts it, completes it and checks the ranking', async ({ page, browser }, info) => {
  const engine = info.project.name.slice(0, 3)
  const host = await createTestAccount(`fum-a-${engine}`)
  const guest = await createTestAccount(`fum-b-${engine}`)
  await give(host, 100)
  await give(guest, 50)

  // The host creates an event on their phone.
  await logIn(page, host)
  await page.getByRole('link', { name: 'Esdeveniments' }).click()
  await page.getByRole('link', { name: 'Nou esdeveniment' }).click()
  await page.getByLabel('Nom').fill('Prova de fum')
  await page.getByLabel('Entrada').fill('10')
  await page.getByRole('checkbox', { name: guest.username }).check({ force: true })
  await page.getByRole('button', { name: "Crea l'esdeveniment" }).click()
  await expect(page.locator('[data-fact="pot"]')).toHaveText('10 marcones')

  // The guest accepts on theirs.
  const { viewport, isMobile, hasTouch, locale, timezoneId, baseURL } = info.project.use
  const guestPhone = await browser.newContext({ viewport, isMobile, hasTouch, locale, timezoneId, baseURL })
  const guestPage = await guestPhone.newPage()
  await logIn(guestPage, guest)
  await guestPage.getByRole('link', { name: 'Esdeveniments' }).click()
  await guestPage.locator('[data-group="invitacions"] [data-event]').filter({ hasText: 'Prova de fum' }).first().click()
  await guestPage.getByRole('button', { name: 'Accepta' }).click()
  await expect(guestPage.locator('[data-fact="pot"]')).toHaveText('20 marcones')

  // The host sees that, and pays the guest.
  await page.reload()
  await page.getByLabel('Qui guanya?').selectOption({ label: guest.username })
  await page.getByRole('button', { name: 'Completa i paga' }).click()
  await expect(page.locator('[data-screen="esdeveniment"] .pill')).toHaveText('Completat')
  await expect(page.locator('[data-place]')).toHaveText([`1r ${guest.username} 20 marcones`])

  // The ranking shows the money where it should be.
  await page.getByRole('link', { name: 'Classificació' }).click()
  const row = (user: TestAccount) => page.locator('.rank-row').filter({ hasText: user.username })
  await expect(row(guest).locator('.count')).toHaveAttribute('data-value', '60')
  await expect(row(host).locator('.count')).toHaveAttribute('data-value', '90')

  await guestPhone.close()
})
