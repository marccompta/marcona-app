import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { adjustBalance, fetchPeople } from '../../src/lib/data'
import { answerInvitation, fetchEvents } from '../../src/lib/events'
import { duelOutcomes, lockIn, type DuelSettings, type MinoriaSettings } from '../../src/lib/games'
import { adminClient, adminLogin, createTestAccount, logInAsDemo, signOutAll, type TestAccount } from '../hosted/env'
import { withDemoPlayers } from './demo-players'

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

test('REQ-100, REQ-102, REQ-112: spins on the real server, and the wheel, balance and audit all agree', async ({ page }, info) => {
  const player = await createTestAccount(`fum-r-${info.project.name.slice(0, 3)}`)
  await give(player, 100)
  await logIn(page, player)

  await page.getByRole('link', { name: 'Ruleta', exact: true }).click()
  // The admin can change the limit, and a bet of 1 is allowed at any setting.
  await expect(page.locator('[data-max-bet]')).toHaveText(/^Aposta màxima: \d+ marcon/)
  await page.getByLabel('Aposta', { exact: true }).fill('1')
  await page.getByRole('button', { name: 'Gira' }).click()

  const shown = page.locator('[data-result]')
  await expect(shown).toBeVisible({ timeout: 15000 })
  const result = (await shown.getAttribute('data-result'))!
  await expect(page.locator('[data-wheel]')).toHaveAttribute('data-landed', result)
  await expect(page.locator('[data-balance] .count')).toHaveAttribute('data-value', result === 'red' ? '101' : '99')

  await page.getByRole('link', { name: 'Auditoria' }).click()
  const colour = { red: 'vermell', black: 'negre', white: 'blanc' }[result]
  // A test account's audit holds every test movement so far, read 1,000 at a time,
  // which takes several seconds while other tests run. Slice 008's wipe clears them.
  await expect(page.locator('[data-movement]').filter({ hasText: player.username }).first()).toContainText(
    `Ruleta: aposta a vermell, ha sortit ${colour}`,
    { timeout: 20000 },
  )
})

// Reads only: another engine may be spinning at the same moment.
test('REQ-100, REQ-115: the admin sees the real roulette settings', async ({ page }) => {
  const { username, password } = adminLogin()
  await logIn(page, { userId: '', username, password })
  await page.getByRole('link', { name: 'Administració' }).click()

  await expect(page.getByLabel('Blanc: 1 de cada')).toHaveValue(/^\d+$/)
  await expect(page.getByLabel('Aposta màxima (% del saldo)')).toHaveValue(/^\d+$/)
})

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

// A game needs the admin, who can't invite test accounts, so this plays a demo
// player. Each engine has its own, because logging in ends that player's session,
// and it waits its turn while La minoria uses both.
test('REQ-100, REQ-134: the admin plays a real duel on a phone, and sees the reveal with no reload', async ({ page }, info) => {
  test.setTimeout(120000)
  const admin = await adminClient()
  const { username, password } = adminLogin()
  const people = await fetchPeople(admin)
  const demo = people.filter((person) => person.username.startsWith('demo-') && !person.removed_at)
  const opponent = demo[info.project.name === 'webkit' ? 1 : 0]
  const me = people.find((person) => person.username === username)!
  const name = `Fum ${randomUUID().slice(0, 8)}`
  for (const userId of [me.user_id, opponent.user_id]) {
    await adjustBalance({ requestId: randomUUID(), userId, action: 'add', amount: 10, concept: 'Prova de fum' }, admin)
  }

  await logIn(page, { userId: me.user_id, username, password })
  await page.getByRole('link', { name: 'Esdeveniments' }).click()
  await page.getByRole('link', { name: 'Nou esdeveniment' }).click()
  await page.getByLabel('Tipus').selectOption({ label: 'Confia o traeix' })
  await page.getByLabel('Nom').fill(name)
  await page.getByLabel('Entrada').fill('10')
  await page.getByRole('checkbox', { name: opponent.username, exact: true }).check({ force: true })
  await page.getByRole('button', { name: "Crea l'esdeveniment" }).click()
  await expect(page.locator('[data-game-rules]')).toBeVisible()

  const event = (await fetchEvents(admin)).find((candidate) => candidate.name === name)!
  await withDemoPlayers(async () => {
    const client = await logInAsDemo(admin, opponent)
    await answerInvitation({ requestId: randomUUID(), eventId: event.id, accept: true }, client)

    // The polling shows the panel once the opponent has paid.
    await page.getByRole('button', { name: 'Tria en privat' }).click({ timeout: 15000 })
    await lockIn({ requestId: randomUUID(), eventId: event.id, choice: 'confia' }, client)
    await page.getByRole('button', { name: 'Traeix' }).click()
  })

  await expect(page.locator('[data-reveal][data-stage="done"]')).toBeVisible({ timeout: 15000 })
  // The admin can change the numbers, so these come from the duel's own copy.
  const { betrayer, betrayed } = duelOutcomes(10, event.settings as DuelSettings)
  await expect(page.locator('[data-reveal-player]')).toHaveText([
    new RegExp(`${username}.*Traeix.*${betrayer} marcon`),
    new RegExp(`${opponent.username}.*Confia.*${betrayed} marcon`),
  ])
})

// La minoria needs 3 players: the admin and both demo players, who are invited and
// accept, so the admin starts it by hand.
test('REQ-100, REQ-156, REQ-161: the admin starts a real La minoria and the smaller side takes the pot', async ({ page }, info) => {
  test.setTimeout(120000)
  const admin = await adminClient()
  const { username, password } = adminLogin()
  const people = await fetchPeople(admin)
  const [nuria, pau] = people.filter((person) => person.username.startsWith('demo-') && !person.removed_at)
  const me = people.find((person) => person.username === username)!
  const name = `Fum ${info.project.name.slice(0, 3)} ${randomUUID().slice(0, 8)}`
  for (const userId of [me.user_id, nuria.user_id, pau.user_id]) {
    await adjustBalance({ requestId: randomUUID(), userId, action: 'add', amount: 10, concept: 'Prova de fum' }, admin)
  }

  await logIn(page, { userId: me.user_id, username, password })
  await page.getByRole('link', { name: 'Esdeveniments' }).click()
  await page.getByRole('link', { name: 'Nou esdeveniment' }).click()
  await page.getByLabel('Tipus').selectOption({ label: 'La minoria' })
  await page.getByLabel('Nom').fill(name)
  await page.getByLabel('Entrada').fill('10')
  for (const player of [nuria, pau]) {
    await page.getByRole('checkbox', { name: player.username, exact: true }).check({ force: true })
  }
  await page.getByRole('button', { name: "Crea l'esdeveniment" }).click()
  await expect(page.locator('[data-minoria]')).toBeVisible()

  // The admin can rename the options, so these come from the game's own copy.
  const event = (await fetchEvents(admin)).find((candidate) => candidate.name === name)!
  const { option_a, option_b } = event.settings as MinoriaSettings

  await withDemoPlayers(async () => {
    const [nuriaPhone, pauPhone] = [await logInAsDemo(admin, nuria), await logInAsDemo(admin, pau)]
    for (const client of [nuriaPhone, pauPhone]) {
      await answerInvitation({ requestId: randomUUID(), eventId: event.id, accept: true }, client)
    }

    // The start appears once 3 have paid.
    await page.getByRole('button', { name: 'Comença el joc' }).click({ timeout: 15000 })
    // The panel appears once the server has started it.
    await expect(page.getByRole('button', { name: 'Tria en privat' })).toBeVisible({ timeout: 15000 })
    await lockIn({ requestId: randomUUID(), eventId: event.id, choice: 'a' }, nuriaPhone)
    await lockIn({ requestId: randomUUID(), eventId: event.id, choice: 'b' }, pauPhone)
  })

  // The admin joins the bigger side, so pau alone takes the pot of 30.
  await page.getByRole('button', { name: 'Tria en privat' }).click({ timeout: 15000 })
  const panel = page.locator('[data-choice-panel]')
  await panel.getByRole('button', { name: option_a, exact: true }).click()
  await panel.getByRole('button', { name: /^Confirma/ }).click()

  await expect(page.locator('[data-reveal][data-stage="done"]')).toBeVisible({ timeout: 15000 })
  const row = (player: string) => page.locator('[data-reveal-player]').filter({ hasText: player })
  await expect(page.locator('[data-reveal-player]')).toHaveCount(3)
  await expect(row(pau.username)).toContainText(`${option_b} 30 marcones`)
  await expect(row(nuria.username)).toContainText(`${option_a} 0 marcones`)
  await expect(row(username)).toContainText(`${option_a} 0 marcones`)
})

// REQ-150, REQ-151: real Realtime, through Row Level Security. Test accounts only
// see each other, so both people here are test accounts.
test('REQ-100, REQ-150, REQ-151: the ranking and audit update by themselves', async ({ page }, info) => {
  // A login can be slow to start.
  test.setTimeout(60000)
  const tag = info.project.name.slice(0, 3)
  const [viewer, other] = await Promise.all([createTestAccount(`fum-v-${tag}`), createTestAccount(`fum-o-${tag}`)])
  await logIn(page, viewer)
  await page.evaluate(() => ((window as unknown as { stayed: boolean }).stayed = true))

  await give(other, 7)
  const row = page.locator('.rank-row').filter({ hasText: other.username })
  await expect(row.locator('.rank-amount')).toHaveText('7', { timeout: 15000 })

  await page.getByRole('link', { name: 'Auditoria' }).click()
  // A test account's audit holds every test movement so far, read 1,000 at a time.
  await expect(page.locator('[data-movement]').first()).toBeVisible({ timeout: 20000 })
  await give(other, 5)
  await expect(page.locator('[data-movement]').filter({ hasText: other.username })).toHaveCount(2, { timeout: 15000 })
  expect(await page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed)).toBe(true)
})
