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

    await expect(page.locator('[data-screen="esdeveniment"]')).toContainText('Pòquer')
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
    await expect(page.locator('[data-screen="esdeveniment"]')).toContainText('Pòquer')

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
        .filter(({ box }) => box.width > 0 && (Math.round(box.width) < 44 || Math.round(box.height) < 44))
        .map(({ element }) => element.outerHTML),
    )
    expect(fits).toBe(true)
    expect(small).toEqual([])
  })
})

test.describe('forced participation', () => {
  const boss = { ...admin, balance: 100 }
  const force = (page: Page) => page.getByRole('checkbox', { name: 'Participació obligatòria' })

  test('REQ-186: the admin sees the option, and it starts off', async ({ page }) => {
    await start(page, boss)
    await openForm(page)
    await expect(force(page)).not.toBeChecked()
  })

  test('REQ-186: a player does not see it', async ({ page }) => {
    await start(page, rich)
    await openForm(page)
    await expect(page.getByRole('checkbox', { name: 'bea' })).toBeAttached()
    await expect(force(page)).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('obligatòria')
  })

  test('REQ-188: forcing charges everyone at once', async ({ page }) => {
    const calls = await start(page, boss)
    await openForm(page)
    await fillForm(page, 'Pòquer', '10', ['anna', 'bea'])
    await force(page).check({ force: true })
    await submit(page)

    await expect(page.locator('[data-screen="esdeveniment"]')).toContainText('Pòquer')
    expect(calls.eventCalls).toMatchObject([{ fn: 'create_event', p_force: true }])
    expect(calls.ledger.map((movement) => movement.username).sort()).toEqual(['anna', 'bea', 'marc'])
    expect(calls.events[0].people).toEqual({ marc: 'accepted', anna: 'accepted', bea: 'accepted' })
  })

  test('REQ-188: without it, an admin event is an ordinary one', async ({ page }) => {
    const calls = await start(page, boss)
    await openForm(page)
    await fillForm(page, 'Pòquer', '10', ['anna'])
    await submit(page)

    await expect(page.locator('[data-screen="esdeveniment"]')).toContainText('Pòquer')
    expect(calls.eventCalls).toMatchObject([{ fn: 'create_event', p_force: false }])
    expect(calls.events[0].people).toEqual({ marc: 'accepted', anna: 'invited' })
  })

  test('REQ-189: a forced player who cannot pay is named in Catalan, and nothing is created', async ({ page }) => {
    const calls = await start(page, boss)
    await openForm(page)
    await fillForm(page, 'Pòquer', '60', ['anna', 'bea'])
    await force(page).check({ force: true })
    await submit(page)

    await expect(page.getByRole('alert')).toHaveText('No tenen prou marcones: bea.')
    expect(calls.events).toEqual([])
    expect(calls.ledger).toEqual([])
  })

  test('REQ-190: the audit shows a forced buy-in on the player, made by the admin', async ({ page }) => {
    const history: FakeMovement[] = [
      {
        username: 'anna',
        delta: -10,
        balance_after: 10,
        concept: null,
        kind: 'event_buy_in',
        event: { id: 'e1', name: 'Pòquer' },
        actor: { username: 'marc' },
      },
    ]
    await start(page, rich, [], history)
    await page.getByRole('link', { name: 'Auditoria' }).click()
    const row = page.locator('[data-movement]')

    await expect(row.locator('.movement-who')).toHaveText('anna')
    await expect(row.locator('.movement-label')).toHaveText('Entrada obligatòria · Pòquer')
    await expect(row.locator('.movement-by')).toHaveText('Feta per marc')
    await expect(row.locator('.delta')).toHaveText('-10')
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

test.describe('an event', () => {
  const screen = '[data-screen="esdeveniment"]'
  const people = (page: Page) => page.locator('[data-participant]')
  const person = (page: Page, username: string) => people(page).filter({ hasText: username })

  const openEvent = async (page: Page, user: FakeUser, event: FakeEvent) => {
    const calls = await start(page, user, [event])
    await page.locator('[data-event]').click()
    await page.locator(screen).waitFor()
    return calls
  }

  const poker: FakeEvent = {
    id: 'e1',
    name: 'Pòquer',
    buy_in: 10,
    creator: 'marc',
    people: { anna: 'accepted', bea: 'invited' },
  }

  test('REQ-098: shows its buy-in, pot, payout rule, participants and status', async ({ page }) => {
    await openEvent(page, rich, poker)

    await expect(page.locator('.detail-name')).toHaveText('Pòquer')
    await expect(page.locator('[data-fact="entrada"]')).toHaveText('10 marcones')
    await expect(page.locator('[data-fact="pot"]')).toHaveText('20 marcones')
    await expect(page.locator('[data-fact="premis"]')).toHaveText('1r 50% · 2n 30% · 3r 20%')
    await expect(page.locator(`${screen} .pill`)).toHaveText('Obert')
    await expect(people(page)).toHaveCount(3)
    await expect(person(page, 'anna')).toContainText('Hi participa')
    await expect(person(page, 'bea')).toContainText('Pendent')
  })

  test('REQ-098: the creator has a crown, and nobody else', async ({ page }) => {
    await openEvent(page, rich, poker)

    await expect(person(page, 'marc').getByRole('img', { name: "Qui l'ha creat" })).toBeVisible()
    await expect(page.getByRole('img', { name: "Qui l'ha creat" })).toHaveCount(1)
  })

  test('REQ-098: the payout rule leaves out places of 0%', async ({ page }) => {
    await openEvent(page, rich, { ...poker, payouts: [0, 60, 40] })
    await expect(page.locator('[data-fact="premis"]')).toHaveText('2n 60% · 3r 40%')
  })

  test('REQ-019: an event that does not exist says so in Catalan', async ({ page }) => {
    await start(page, rich)
    await page.goto('#/esdeveniments/no-existeix')
    await expect(page.locator(screen)).toContainText('No hem trobat aquest esdeveniment.')
  })

  test.describe('as an invited player', () => {
    const invited: FakeEvent = { ...poker, people: { anna: 'invited', bea: 'accepted' } }

    test('REQ-079: accepting charges the buy-in and makes me a participant', async ({ page }) => {
      const calls = await openEvent(page, rich, invited)
      await page.getByRole('button', { name: 'Accepta' }).click()

      await expect(person(page, 'anna')).toContainText('Hi participa')
      await expect(page.locator('[data-fact="pot"]')).toHaveText('30 marcones')
      await expect(page.getByRole('button', { name: 'Accepta' })).toHaveCount(0)
      expect(calls.ledger).toMatchObject([{ username: 'anna', delta: -10, balance_after: 90, kind: 'event_buy_in' }])
    })

    test('REQ-080: without enough marcones I get a Catalan error and stay invited', async ({ page }) => {
      const calls = await openEvent(page, { ...rich, balance: 5 }, invited)
      await page.getByRole('button', { name: 'Accepta' }).click()

      await expect(page.getByRole('alert')).toHaveText('El saldo no té prou marcones.')
      await expect(person(page, 'anna')).toContainText('Pendent')
      await expect(page.getByRole('button', { name: 'Accepta' })).toBeVisible()
      expect(calls.ledger).toEqual([])
    })

    test('REQ-062: a retry of a refused answer keeps the same request ID', async ({ page }) => {
      const calls = await openEvent(page, { ...rich, balance: 5 }, invited)
      for (const attempt of [1, 2]) {
        await page.getByRole('button', { name: 'Accepta' }).click()
        await expect.poll(() => calls.eventCalls.length).toBe(attempt)
        await expect(page.getByRole('alert')).toBeVisible()
      }

      const [first, second] = calls.eventCalls.map((call) => call.p_request_id)
      expect(second).toBe(first)
    })

    test('REQ-081: declining charges nothing and shows me as declined', async ({ page }) => {
      const calls = await openEvent(page, rich, invited)
      await page.getByRole('button', { name: 'Rebutja' }).click()

      await expect(person(page, 'anna')).toContainText('Ha rebutjat')
      await expect(page.getByRole('button', { name: 'Rebutja' })).toHaveCount(0)
      expect(calls.ledger).toEqual([])
    })

    test('REQ-082, REQ-094: an invitation that has lapsed offers nothing to answer', async ({ page }) => {
      await openEvent(page, rich, { ...invited, status: 'cancelled', people: { anna: 'lapsed' } })

      await expect(person(page, 'anna')).toContainText('Invitació caducada')
      await expect(page.locator(`${screen} button`)).toHaveCount(0)
    })

    test('REQ-082: an answer the server refuses shows a Catalan error', async ({ page }) => {
      const calls = await openEvent(page, rich, invited)
      const accept = page.getByRole('button', { name: 'Accepta' })
      await accept.waitFor()
      calls.events[0].people.anna = 'lapsed'
      await accept.click()
      await expect(page.getByRole('alert')).toHaveText('Aquesta invitació ja no està pendent.')
    })
  })

  test.describe('cancelling', () => {
    const mine: FakeEvent = { id: 'e1', name: 'Dards', buy_in: 10, creator: 'anna', people: { bea: 'accepted', marc: 'invited' } }

    test('REQ-084, REQ-094: the creator confirms, everyone is refunded, and invitations lapse', async ({ page }) => {
      const calls = await openEvent(page, rich, mine)
      await page.getByRole('button', { name: "Cancel·la l'esdeveniment" }).click()
      await expect(page.locator(`${screen} .pill`)).toHaveText('Obert')
      expect(calls.eventCalls).toEqual([])

      await page.getByRole('button', { name: 'Sí, cancel·la' }).click()

      await expect(page.locator(`${screen} .pill`)).toHaveText('Cancel·lat')
      await expect(person(page, 'marc')).toContainText('Invitació caducada')
      await expect(page.locator(`${screen} button`)).toHaveCount(0)
      expect(calls.ledger.filter((movement) => movement.kind === 'event_refund').map((movement) => movement.username).sort()).toEqual(['anna', 'bea'])
    })

    test('REQ-084: saying no leaves it open', async ({ page }) => {
      const calls = await openEvent(page, rich, mine)
      await page.getByRole('button', { name: "Cancel·la l'esdeveniment" }).click()
      await page.getByRole('button', { name: 'No, torna enrere' }).click()

      await expect(page.getByRole('button', { name: "Cancel·la l'esdeveniment" })).toBeVisible()
      expect(calls.eventCalls).toEqual([])
    })

    test('REQ-085: the admin can cancel someone else\'s event, but not complete it', async ({ page }) => {
      await openEvent(page, { ...admin, balance: 100 }, mine)

      await expect(page.getByRole('button', { name: "Cancel·la l'esdeveniment" })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Completa i paga' })).toHaveCount(0)
    })

    test('REQ-086, REQ-087: a participant has no way to cancel or withdraw', async ({ page }) => {
      await openEvent(page, { ...bea }, mine)
      await expect(person(page, 'bea')).toContainText('Hi participa')
      await expect(page.locator(`${screen} button`)).toHaveCount(0)
    })

    test('REQ-086: nor does someone with nothing to do with it', async ({ page }) => {
      await openEvent(page, { ...bea }, { ...mine, people: { marc: 'accepted' } })
      await expect(page.locator(`${screen} button`)).toHaveCount(0)
    })
  })

  test.describe('completing', () => {
    const everyone: FakeEvent = {
      id: 'e1',
      name: 'Dards',
      buy_in: 7,
      creator: 'anna',
      people: { bea: 'accepted', marc: 'accepted' },
    }

    const pick = async (page: Page, place: string, username: string) =>
      page.getByLabel(place).selectOption({ label: username })

    const finish = (page: Page) => page.getByRole('button', { name: 'Completa i paga' }).click()

    test('REQ-088, REQ-089: alone, I can only wait', async ({ page }) => {
      await openEvent(page, rich, { ...everyone, people: { bea: 'invited' } })

      await expect(page.getByRole('button', { name: 'Completa i paga' })).toHaveCount(0)
      await expect(page.locator(screen)).toContainText('Calen almenys 2 persones per completar-lo.')
    })

    test('REQ-091: with 2 players I pick the winner, who gets the whole pot', async ({ page }) => {
      const calls = await openEvent(page, rich, { ...everyone, buy_in: 10, people: { bea: 'accepted' } })
      await expect(page.locator(screen)).toContainText("Amb 2 persones, qui guanya s'ho emporta tot.")
      await expect(page.getByLabel('1r lloc')).toHaveCount(0)
      await pick(page, 'Qui guanya?', 'bea')
      await finish(page)

      await expect(page.locator(`${screen} .pill`)).toHaveText('Completat')
      await expect(page.locator('[data-place]')).toHaveText(['1r bea 20 marcones'])
      await expect(page.locator(`${screen} button`)).toHaveCount(0)
      expect(calls.ledger.at(-1)).toMatchObject({ username: 'bea', delta: 20, kind: 'event_payout' })
    })

    test('REQ-092: the same person twice gets a Catalan error, and nothing is paid', async ({ page }) => {
      const calls = await openEvent(page, rich, everyone)
      await pick(page, '1r lloc', 'bea')
      await pick(page, '2n lloc', 'bea')
      await pick(page, '3r lloc', 'marc')
      await finish(page)

      await expect(page.getByRole('alert')).toHaveText('Tria una persona diferent per a cada lloc amb premi.')
      await expect(page.locator(`${screen} .pill`)).toHaveText('Obert')
      expect(calls.ledger.filter((movement) => movement.kind === 'event_payout')).toEqual([])
    })

    test('REQ-092: only participants can be picked, and a place of 0% asks for nobody', async ({ page }) => {
      await openEvent(page, rich, { ...everyone, payouts: [0, 60, 40], people: { bea: 'accepted', marc: 'accepted', gone: 'declined' } })

      await expect(page.getByLabel('1r lloc')).toHaveCount(0)
      await expect(page.getByLabel('2n lloc').locator('option')).toHaveText(['Tria…', 'anna', 'bea', 'marc'])
    })

    test('REQ-093: a pot of 21 pays 11, 6 and 4, and shows it', async ({ page }) => {
      await openEvent(page, rich, everyone)
      await pick(page, '1r lloc', 'bea')
      await pick(page, '2n lloc', 'anna')
      await pick(page, '3r lloc', 'marc')
      await finish(page)

      await expect(page.locator('[data-place]')).toHaveText(['1r bea 11 marcones', '2n anna 6 marcones', '3r marc 4 marcones'])
    })

    test('REQ-093: a place that rounds down to 0 still shows', async ({ page }) => {
      await openEvent(page, rich, { ...everyone, buy_in: 1, payouts: [98, 1, 1] })
      await pick(page, '1r lloc', 'bea')
      await pick(page, '2n lloc', 'anna')
      await pick(page, '3r lloc', 'marc')
      await finish(page)

      await expect(page.locator('[data-place]')).toHaveText(['1r bea 3 marcones', '2n anna 0 marcones', '3r marc 0 marcones'])
    })

    test('REQ-020: the pickers are drawn by the site, so their text stays readable on Safari', async ({ page }) => {
      await openEvent(page, rich, everyone)
      const style = await page.getByLabel('1r lloc').evaluate((select) => {
        const { appearance, backgroundColor, color } = getComputedStyle(select)
        return { appearance, backgroundColor, color }
      })

      expect(style).toEqual({ appearance: 'none', backgroundColor: 'rgb(3, 26, 21)', color: 'rgb(246, 241, 220)' })
    })

    test('REQ-083: a finished event offers no actions, even to its creator', async ({ page }) => {
      const results = [{ place: 1, user_id: 'bea', percentage: 100, amount: 21 }]
      await openEvent(page, rich, { ...everyone, status: 'completed', results })

      await expect(page.locator(`${screen} button`)).toHaveCount(0)
      await expect(page.locator('[data-place]')).toHaveText(['1r bea 21 marcones'])
    })

    test('REQ-023, REQ-024: the screen fits, with every action open, and has big enough targets', async ({ page }) => {
      await openEvent(page, rich, everyone)
      await page.getByRole('button', { name: "Cancel·la l'esdeveniment" }).click()

      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      const small = await page.evaluate(() =>
        [...document.querySelectorAll('[data-screen] a, [data-screen] button, [data-screen] select')]
          .map((element) => ({ element, box: element.getBoundingClientRect() }))
          .filter(({ box }) => box.width > 0 && (Math.round(box.width) < 44 || Math.round(box.height) < 44))
          .map(({ element }) => element.outerHTML),
      )
      expect(fits).toBe(true)
      expect(small).toEqual([])
    })
  })

  test('REQ-099: a movement in the audit opens its event', async ({ page }) => {
    const history: FakeMovement[] = [
      {
        username: 'anna',
        delta: -10,
        balance_after: 90,
        concept: null,
        kind: 'event_buy_in',
        event: { id: 'e1', name: 'Pòquer' },
        actor: { username: 'anna' },
      },
    ]
    await start(page, rich, [poker], history)
    await page.getByRole('link', { name: 'Auditoria' }).click()
    await expect(page.locator('.movement-label')).toHaveText('Entrada · Pòquer')
    await page.locator('[data-movement]').click()

    await expect(page.locator('.detail-name')).toHaveText('Pòquer')
  })
})
