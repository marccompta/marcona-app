import { expect, test, type Page } from '@playwright/test'
import { admin, fakeSupabase, logIn, player, type FakeEvent, type FakeMovement, type FakeUser } from './fake-supabase'

const bea: FakeUser = { username: 'bea', password: 'x', role: 'player', balance: 50 }
const gone: FakeUser = { username: 'gone', password: 'x', role: 'player', removed: true }
const rich = { ...player, balance: 100 }

const start = async (page: Page, user: FakeUser, events: FakeEvent[] = [], history: FakeMovement[] = []) => {
  const others = [{ ...admin, balance: 100 }, rich, bea, gone].filter((other) => other.username !== user.username)
  const calls = await fakeSupabase(page, [user, ...others], history, events)
  await logIn(page, user)
  await page.getByRole('link', { name: 'Esdeveniments' }).click()
  await page.locator('[data-screen="esdeveniments"]').waitFor()
  return calls
}

const openForm = async (page: Page) => {
  await page.getByRole('link', { name: 'Nou esdeveniment' }).click()
  await page.locator('[data-screen="nou-esdeveniment"]').waitFor()
}

const fillForm = async (page: Page, name: string, buyIn: string, invitees: string[]) => {
  await page.getByLabel('Nom').fill(name)
  await page.getByLabel('Entrada').fill(buyIn)
  for (const invitee of invitees) await page.getByRole('checkbox', { name: invitee }).check({ force: true })
}

const submit = (page: Page) => page.getByRole('button', { name: "Crea l'esdeveniment" }).click()

test.beforeEach(async ({ page }) => {
  await page.goto('')
})

test.describe('the new event form', () => {
  test('REQ-073: the percentages start at 50, 30 and 20', async ({ page }) => {
    await start(page, rich)
    await openForm(page)

    await expect(page.getByLabel('1r')).toHaveValue('50')
    await expect(page.getByLabel('2n')).toHaveValue('30')
    await expect(page.getByLabel('3r')).toHaveValue('20')
  })

  test('REQ-078: lists other active users, but not me or removed users', async ({ page }) => {
    await start(page, rich)
    await openForm(page)

    await expect(page.getByRole('checkbox')).toHaveCount(2)
    await expect(page.getByRole('checkbox', { name: 'marc' })).toBeAttached()
    await expect(page.getByRole('checkbox', { name: 'bea' })).toBeAttached()
  })

  test('REQ-071, REQ-072: creating an event sends everything, and it appears as open', async ({ page }) => {
    const calls = await start(page, rich)
    await openForm(page)
    await fillForm(page, 'Pòquer', '10', ['bea'])
    await submit(page)

    await expect(page.locator('[data-event]')).toContainText('Pòquer')
    expect(calls.eventCalls).toMatchObject([
      {
        fn: 'create_event',
        p_name: 'Pòquer',
        p_buy_in: 10,
        p_invitees: ['bea'],
        p_payout_first: 50,
        p_payout_second: 30,
        p_payout_third: 20,
      },
    ])
    expect(calls.ledger).toMatchObject([{ username: 'anna', delta: -10, balance_after: 90, kind: 'event_buy_in' }])
  })

  const refusals = [
    { title: 'REQ-074: percentages that sum to 90', edit: async (page: Page) => page.getByLabel('3r').fill('10'), message: 'Els percentatges han de ser enters i sumar 100.' },
    { title: 'REQ-075: a buy-in of 0', edit: async (page: Page) => page.getByLabel('Entrada').fill('0'), message: "L'entrada ha de ser un nombre enter d'1 o més." },
    { title: 'REQ-075: a buy-in of 1.5', edit: async (page: Page) => page.getByLabel('Entrada').fill('1.5'), message: "L'entrada ha de ser un nombre enter d'1 o més." },
    { title: 'REQ-076: a buy-in above my balance', edit: async (page: Page) => page.getByLabel('Entrada').fill('101'), message: 'El saldo no té prou marcones.' },
    { title: 'REQ-077: no invitees', edit: async (page: Page) => page.getByRole('checkbox', { name: 'bea' }).uncheck({ force: true }), message: 'Convida almenys una persona.' },
    { title: 'REQ-071: no name', edit: async (page: Page) => page.getByLabel('Nom').fill('  '), message: "Escriu un nom per a l'esdeveniment." },
  ]

  for (const { title, edit, message } of refusals) {
    test(`${title} gets a Catalan error, and creates nothing`, async ({ page }) => {
      const calls = await start(page, rich)
      await openForm(page)
      await fillForm(page, 'Pòquer', '10', ['bea'])
      await edit(page)
      await submit(page)

      await expect(page.getByRole('alert')).toHaveText(message)
      await expect(page.locator('[data-screen="nou-esdeveniment"]')).toBeVisible()
      expect(calls.events).toEqual([])
      expect(calls.ledger).toEqual([])
    })
  }

  test('REQ-062: a retry after a failure keeps the same request ID, and an edit starts a new one', async ({ page }) => {
    const calls = await start(page, rich)
    await openForm(page)
    await fillForm(page, 'Pòquer', '500', ['bea'])
    await submit(page)
    await expect(page.getByRole('alert')).toBeVisible()
    await submit(page)
    await expect(page.getByRole('alert')).toBeVisible()
    await page.getByLabel('Entrada').fill('10')
    await submit(page)
    await expect(page.locator('[data-event]')).toContainText('Pòquer')

    const ids = calls.eventCalls.map((call) => call.p_request_id)
    expect(ids).toHaveLength(3)
    expect(ids[1]).toBe(ids[0])
    expect(ids[2]).not.toBe(ids[0])
  })

  test('REQ-023, REQ-024: the form fits and has big enough targets', async ({ page }) => {
    await start(page, rich)
    await openForm(page)

    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('[data-screen] a, [data-screen] button, [data-screen] input')]
        .map((element) => ({ element, box: element.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 0 && (box.width < 44 || box.height < 44))
        .map(({ element }) => element.outerHTML),
    )
    expect(fits).toBe(true)
    expect(small).toEqual([])
  })
})

test.describe('the events list', () => {
  const events: FakeEvent[] = [
    { id: 'e1', name: 'Dards', buy_in: 5, creator: 'marc', status: 'completed', people: { anna: 'accepted' } },
    { id: 'e2', name: 'Bitlles', buy_in: 5, creator: 'marc', status: 'cancelled', people: { anna: 'lapsed' } },
    { id: 'e3', name: 'Dòmino', buy_in: 7, creator: 'bea', people: { marc: 'invited' } },
    { id: 'e4', name: 'Pòquer', buy_in: 10, creator: 'marc', people: { anna: 'invited', bea: 'accepted' } },
    { id: 'e5', name: 'Parxís', buy_in: 2, creator: 'anna', people: { bea: 'invited' } },
  ]

  const inGroup = (page: Page, group: string) => page.locator(`[data-group="${group}"] [data-event]`)

  test('REQ-097: groups my invitations, open events and past events', async ({ page }) => {
    await start(page, rich, events)

    await expect(page.getByRole('heading', { name: 'Invitacions' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Oberts' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Passats' })).toBeVisible()
    await expect(inGroup(page, 'invitacions')).toHaveCount(1)
    await expect(inGroup(page, 'invitacions')).toContainText('Pòquer')
    await expect(inGroup(page, 'oberts').locator('.event-name')).toHaveText(['Parxís', 'Dòmino'])
    await expect(inGroup(page, 'passats').locator('.event-name')).toHaveText(['Bitlles', 'Dards'])
  })

  test('REQ-097: each row shows the buy-in, the pot and a pill with the status', async ({ page }) => {
    await start(page, rich, events)
    const row = inGroup(page, 'invitacions').first()

    await expect(row.locator('.event-meta')).toHaveText('Entrada 10 · Pot 20')
    await expect(row.locator('.pill')).toHaveText('Obert')
    await expect(inGroup(page, 'passats').first().locator('.pill')).toHaveText('Cancel·lat')
    await expect(inGroup(page, 'passats').last().locator('.pill')).toHaveText('Completat')
  })

  test('REQ-097: empty groups say so in Catalan', async ({ page }) => {
    await start(page, rich)

    await expect(page.locator('[data-group="invitacions"]')).toContainText('No tens cap invitació pendent.')
    await expect(page.locator('[data-group="oberts"]')).toContainText('No hi ha cap esdeveniment obert.')
    await expect(page.locator('[data-group="passats"]')).toContainText('Encara no hi ha cap esdeveniment passat.')
  })

  test('REQ-019: a failed load shows Catalan', async ({ page }) => {
    await start(page, rich)
    await page.route('**/rest/v1/events**', (route) =>
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

  test('REQ-023, REQ-024: the list fits and has big enough targets', async ({ page }) => {
    await start(page, rich, events)
    await page.locator('[data-event]').first().waitFor()

    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('[data-screen] a')].filter((link) => link.getBoundingClientRect().height < 44).map((link) => link.outerHTML),
    )
    expect(fits).toBe(true)
    expect(small).toEqual([])
  })
})
