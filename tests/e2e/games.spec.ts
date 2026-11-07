import { expect, test, type Page } from '@playwright/test'
import { admin, fakeSupabase, logIn, player, type FakeEvent, type FakeUser } from './fake-supabase'

const richAdmin = { ...admin, balance: 100 }
const anna = { ...player, balance: 100 }
const bea: FakeUser = { username: 'bea', password: 'x', role: 'player', balance: 50 }

const start = async (page: Page, user: FakeUser, events: FakeEvent[] = []) => {
  const others = [richAdmin, anna, bea].filter((other) => other.username !== user.username)
  const calls = await fakeSupabase(page, [user, ...others], [], events)
  await logIn(page, user)
  await page.getByRole('link', { name: 'Esdeveniments' }).click()
  await page.locator('[data-screen="esdeveniments"]').waitFor()
  return calls
}

const openForm = async (page: Page) => {
  await page.getByRole('link', { name: 'Nou esdeveniment' }).click()
  await page.locator('[data-screen="nou-esdeveniment"]').waitFor()
}

const chooseDuel = (page: Page) => page.getByLabel('Tipus').selectOption({ label: 'Confia o traeix' })

const fillDuel = async (page: Page, invitees: string[]) => {
  await chooseDuel(page)
  await page.getByLabel('Nom').fill('El duel')
  await page.getByLabel('Entrada').fill('10')
  for (const invitee of invitees) await page.getByRole('checkbox', { name: invitee, exact: true }).check({ force: true })
}

const submit = (page: Page) => page.getByRole('button', { name: "Crea l'esdeveniment" }).click()
const plays = (page: Page) => page.getByRole('checkbox', { name: 'Hi jugo' })

test.beforeEach(async ({ page }) => {
  await page.goto('')
})

test.describe('the event type', () => {
  test('REQ-175: the admin can choose classic or a game that is on', async ({ page }) => {
    await start(page, richAdmin)
    await openForm(page)

    await expect(page.getByLabel('Tipus').locator('option')).toHaveText(['Clàssic', 'Confia o traeix'])
    await expect(page.getByLabel('Tipus')).toHaveValue('classic')
  })

  test('REQ-175, REQ-146: a game that is off is not offered', async ({ page }) => {
    const calls = await start(page, richAdmin)
    calls.games[0].enabled = false
    await openForm(page)

    await expect(page.getByLabel('Tipus').locator('option')).toHaveText(['Clàssic'])
  })

  test('REQ-177: anyone else only gets a classic event, and never asks for the games', async ({ page }) => {
    const asked: string[] = []
    page.on('request', (request) => asked.push(request.url()))
    await start(page, anna)
    await openForm(page)

    await expect(page.getByLabel('Entrada')).toBeVisible()
    await expect(page.getByLabel('Tipus')).toHaveCount(0)
    await expect(plays(page)).toHaveCount(0)
    expect(asked.filter((url) => url.includes('/rest/v1/games'))).toEqual([])
  })

  test('REQ-175: a game has no payout percentages to fill in, and classic keeps them', async ({ page }) => {
    await start(page, richAdmin)
    await openForm(page)
    await expect(page.getByLabel('1r')).toBeVisible()

    await chooseDuel(page)
    await expect(page.getByLabel('1r')).toHaveCount(0)
    await page.getByLabel('Tipus').selectOption({ label: 'Clàssic' })
    await expect(page.getByLabel('1r')).toHaveValue('50')
    await expect(plays(page)).toHaveCount(0)
  })
})

test.describe('creating a duel', () => {
  test('REQ-178, REQ-179: the admin plays, and is charged', async ({ page }) => {
    const calls = await start(page, richAdmin)
    await openForm(page)
    await fillDuel(page, ['anna'])
    await expect(plays(page)).toBeChecked()
    await submit(page)

    await page.locator('[data-screen="esdeveniment"]').waitFor()
    await expect(page.getByRole('heading', { name: 'El duel' })).toBeVisible()
    expect(calls.eventCalls.at(-1)).toMatchObject({ fn: 'create_game_event', p_game: 'confia_o_traeix', p_plays: true, p_invitees: ['anna'] })
    expect(calls.ledger.at(-1)).toMatchObject({ username: 'marc', delta: -10, balance_after: 90 })
  })

  test('REQ-178, REQ-181: the admin runs it without playing, and is not charged', async ({ page }) => {
    const calls = await start(page, richAdmin)
    await openForm(page)
    await fillDuel(page, ['anna', 'bea'])
    await plays(page).uncheck({ force: true })
    await submit(page)

    await page.locator('[data-screen="esdeveniment"]').waitFor()
    expect(calls.eventCalls.at(-1)).toMatchObject({ p_plays: false, p_invitees: ['anna', 'bea'] })
    expect(calls.ledger).toEqual([])
  })

  test('REQ-182: the form says how many to invite, which changes with the option to play', async ({ page }) => {
    await start(page, richAdmin)
    await openForm(page)
    await chooseDuel(page)

    await expect(page.locator('[data-invite-hint]')).toHaveText('Convida 1 persona.')
    await plays(page).uncheck({ force: true })
    await expect(page.locator('[data-invite-hint]')).toHaveText('Convida 2 persones.')
  })

  test('REQ-182: the wrong number of players shows a Catalan error, and creates nothing', async ({ page }) => {
    const calls = await start(page, richAdmin)
    await openForm(page)
    await fillDuel(page, ['anna', 'bea'])
    await submit(page)

    await expect(page.getByRole('alert')).toHaveText('Un duel és entre exactament dues persones diferents.')
    expect(calls.events).toEqual([])
  })

  test('REQ-180: without enough marcones the admin sees a Catalan error', async ({ page }) => {
    const calls = await start(page, { ...admin, balance: 5 })
    await openForm(page)
    await fillDuel(page, ['anna'])
    await submit(page)

    await expect(page.getByRole('alert')).toHaveText('El saldo no té prou marcones.')
    expect(calls.events).toEqual([])
  })

  test('REQ-121: a game turned off after the form opened shows a Catalan error', async ({ page }) => {
    const calls = await start(page, richAdmin)
    await openForm(page)
    await fillDuel(page, ['anna'])
    calls.games[0].enabled = false
    await submit(page)

    await expect(page.getByRole('alert')).toHaveText('Aquest joc està desactivat.')
  })

  test('REQ-191: forcing a duel charges both players and goes straight to choosing', async ({ page }) => {
    const calls = await start(page, richAdmin)
    await openForm(page)
    await fillDuel(page, ['anna', 'bea'])
    await plays(page).uncheck({ force: true })
    await page.getByRole('checkbox', { name: 'Participació obligatòria' }).check({ force: true })
    await submit(page)

    await page.locator('[data-screen="esdeveniment"]').waitFor()
    expect(calls.events.at(-1)).toMatchObject({ phase: 'choosing', people: { anna: 'accepted', bea: 'accepted' } })
    expect(calls.ledger.map((movement) => movement.username).sort()).toEqual(['anna', 'bea'])
  })

  test('REQ-062: a retry after a refusal keeps nothing of the old attempt once the form changes', async ({ page }) => {
    const calls = await start(page, richAdmin)
    await openForm(page)
    await fillDuel(page, ['anna', 'bea'])
    await submit(page)
    await expect(page.getByRole('alert')).toBeVisible()
    await page.getByRole('checkbox', { name: 'bea', exact: true }).uncheck({ force: true })
    await submit(page)

    await page.locator('[data-screen="esdeveniment"]').waitFor()
    const [first, second] = calls.eventCalls.filter((call) => call.fn === 'create_game_event')
    expect(first.p_request_id).not.toBe(second.p_request_id)
  })
})
