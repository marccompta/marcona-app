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

const duel = (fields: Partial<FakeEvent> = {}): FakeEvent => ({
  id: 'd1',
  name: 'El duel',
  buy_in: 11,
  creator: 'marc',
  game: 'confia_o_traeix',
  phase: 'choosing',
  creator_plays: false,
  people: { anna: 'accepted', bea: 'accepted' },
  ...fields,
})

const openDuel = async (page: Page) => {
  await page.locator('[data-event]').filter({ hasText: 'El duel' }).click()
  await page.locator('[data-screen="esdeveniment"]').waitFor()
}

const startDuel = async (page: Page, user: FakeUser, fields: Partial<FakeEvent> = {}) => {
  const calls = await start(page, user, [duel(fields)])
  await openDuel(page)
  return calls
}

const panelOpener = (page: Page) => page.getByRole('button', { name: 'Tria en privat' })
const panel = (page: Page) => page.locator('[data-choice-panel]')
const choiceButton = (page: Page, name: 'Confia' | 'Traeix') => panel(page).getByRole('button', { name })
const closePanel = (page: Page) => panel(page).getByRole('button', { name: 'Tanca' }).click()
const resting = (page: Page) => page.locator('[data-screen="esdeveniment"]').evaluate((screen) => screen.outerHTML)
const glowing = (page: Page) => page.locator('[data-choice-panel] [data-glowing="true"]')

test.describe('the event screen of a duel', () => {
  test('REQ-129: explains the rules and every payoff, worked out for this buy-in', async ({ page }) => {
    await startDuel(page, anna)

    await expect(page.locator('[data-game-rules]')).toContainText('Dues persones, una decisió secreta.')
    await expect(page.locator('[data-fact="joc"]')).toHaveText('Confia o traeix')
    await expect(page.locator('[data-fact="entrada"]')).toHaveText('11 marcones')
    await expect(page.locator('[data-payoff]')).toHaveText([
      /Totes dues confien.*Cada persona rep 16 marcones \(150%\)/,
      /Una traeix i l'altra confia.*Qui traeix rep 27 marcones \(250%\).*Qui confia rep 0 marcones \(0%\)/,
      /Totes dues traeixen.*Cada persona rep 5 marcones \(50%\)/,
    ])
  })

  test('REQ-123, REQ-149: the rules shown are the ones stored with the event', async ({ page }) => {
    const calls = await start(page, anna, [
      duel({ settings: { both_trust: 120, betrayer: 300, betrayed: 10, both_betray: 20, description: 'Regles antigues.' } }),
    ])
    calls.games[0].description = 'Regles noves.'
    await openDuel(page)

    await expect(page.locator('[data-game-rules]')).toContainText('Regles antigues.')
    await expect(page.locator('[data-payoff]').first()).toContainText('13 marcones (120%)')
  })

  test('REQ-124: a duel has no way to pick a winner', async ({ page }) => {
    await startDuel(page, richAdmin, { creator_plays: true, people: { marc: 'accepted', anna: 'accepted' } })

    await expect(page.getByRole('button', { name: 'Completa i paga' })).toHaveCount(0)
    await expect(page.getByLabel('Qui guanya?')).toHaveCount(0)
    await expect(page.getByRole('button', { name: "Cancel·la l'esdeveniment" })).toBeVisible()
  })

  test('REQ-181: an admin who is not playing shows as the organiser, not as a player', async ({ page }) => {
    await startDuel(page, anna)

    await expect(page.locator('[data-organiser]')).toContainText('marc')
    await expect(page.locator('[data-organiser] .crown')).toBeVisible()
    await expect(page.locator('[data-participant]')).toHaveCount(2)
    await expect(page.locator('[data-participant]').filter({ hasText: 'marc' })).toHaveCount(0)
  })

  test('REQ-179: an admin who plays is a player with the crown, and no separate organiser', async ({ page }) => {
    await startDuel(page, anna, { creator_plays: true, people: { marc: 'accepted', anna: 'accepted' } })

    await expect(page.locator('[data-organiser]')).toHaveCount(0)
    await expect(page.locator('[data-participant]').filter({ hasText: 'marc' }).locator('.crown')).toBeVisible()
  })

  test('REQ-125: someone outside the duel has no panel, and nor does anyone until both have paid', async ({ page }) => {
    await startDuel(page, richAdmin)
    await expect(panelOpener(page)).toHaveCount(0)
    await expect(page.locator('[data-game-waiting]')).toHaveText('Les dues persones estan triant.')
  })

  test('REQ-125: a player who has paid waits for the other, with nothing to tap', async ({ page }) => {
    await startDuel(page, anna, { phase: 'inviting', people: { anna: 'accepted', bea: 'invited' } })
    await expect(panelOpener(page)).toHaveCount(0)
    await expect(page.locator('[data-game-waiting]')).toHaveText('Falta que les dues persones hi entrin.')
  })

  test('REQ-183: an invited player can accept or decline a duel', async ({ page }) => {
    const calls = await startDuel(page, bea, { phase: 'inviting', people: { anna: 'accepted', bea: 'invited' } })
    await page.getByRole('button', { name: 'Rebutja' }).click()

    await expect(page.locator('[data-screen="esdeveniment"] .pill')).toHaveText('Cancel·lat')
    expect(calls.ledger.at(-1)).toMatchObject({ username: 'anna', delta: 11, kind: 'event_refund' })
  })

  test('REQ-135: cancelling a stuck duel refunds both', async ({ page }) => {
    const calls = await startDuel(page, richAdmin)
    await page.getByRole('button', { name: "Cancel·la l'esdeveniment" }).click()
    await page.getByRole('button', { name: 'Sí, cancel·la' }).click()

    await expect(page.locator('[data-screen="esdeveniment"] .pill')).toHaveText('Cancel·lat')
    expect(calls.ledger.filter((movement) => movement.kind === 'event_refund').map((movement) => movement.username).sort()).toEqual([
      'anna',
      'bea',
    ])
  })

  test('REQ-023, REQ-024: fits the phone, and the panel has big targets set well apart', async ({ page }) => {
    await startDuel(page, anna)
    await panelOpener(page).click()

    const width = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(width).toBeLessThanOrEqual(360)
    const [confia, traeix] = await Promise.all([choiceButton(page, 'Confia').boundingBox(), choiceButton(page, 'Traeix').boundingBox()])
    expect(confia!.height).toBeGreaterThanOrEqual(44)
    expect(traeix!.height).toBeGreaterThanOrEqual(44)
    expect(traeix!.y - (confia!.y + confia!.height)).toBeGreaterThanOrEqual(40)
  })
})

test.describe('the private panel', () => {
  test('REQ-202: the buttons are behind the panel, so a stray tap on the rules does nothing', async ({ page }) => {
    await startDuel(page, anna)

    await expect(page.getByRole('button', { name: 'Confia', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Traeix', exact: true })).toHaveCount(0)
    await panelOpener(page).click()
    await expect(choiceButton(page, 'Confia')).toBeVisible()
    await expect(choiceButton(page, 'Traeix')).toBeVisible()
  })

  test('REQ-202, REQ-203: one tap saves at once, and that button glows for two seconds', async ({ page }) => {
    const calls = await startDuel(page, anna)
    await panelOpener(page).click()
    const before = await panel(page).evaluate((element) => element.outerHTML)

    const glowMs = page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let began = 0
          new MutationObserver(() => {
            const lit = document.querySelector('[data-choice-panel] [data-glowing="true"]')
            if (lit && !began) began = performance.now()
            if (!lit && began) resolve(performance.now() - began)
          }).observe(document.body, { subtree: true, attributes: true })
        }),
    )
    await choiceButton(page, 'Traeix').click()

    await expect(choiceButton(page, 'Traeix')).toHaveAttribute('data-glowing', 'true')
    await expect(choiceButton(page, 'Confia')).toHaveAttribute('data-glowing', 'false')
    expect(calls.choices.d1).toEqual({ anna: 'traeix' })
    expect(calls.eventCalls.filter((call) => call.fn === 'lock_in')).toHaveLength(1)

    const lit = await glowMs
    expect(lit).toBeGreaterThan(1800)
    expect(lit).toBeLessThan(2500)
    // REQ-203: no other feedback, so the panel is back exactly as it was.
    expect(await panel(page).evaluate((element) => element.outerHTML)).toBe(before)
  })

  test('REQ-203: the glow means saved, so it waits for the server', async ({ page }) => {
    await startDuel(page, anna)
    let release = () => {}
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route('**/rest/v1/rpc/lock_in', async (route) => {
      await held
      await route.fallback()
    })
    await panelOpener(page).click()
    await choiceButton(page, 'Confia').click()

    await page.waitForTimeout(400)
    await expect(glowing(page)).toHaveCount(0)
    release()
    await expect(choiceButton(page, 'Confia')).toHaveAttribute('data-glowing', 'true')
  })

  test('REQ-202: on a slow connection, the last tap wins and no two taps overlap', async ({ page }) => {
    const calls = await startDuel(page, anna)
    let open = 0
    let most = 0
    await page.route('**/rest/v1/rpc/lock_in', async (route) => {
      open += 1
      most = Math.max(most, open)
      await new Promise((resolve) => setTimeout(resolve, 300))
      await route.fallback()
      open -= 1
    })
    await panelOpener(page).click()

    await choiceButton(page, 'Confia').click()
    await choiceButton(page, 'Traeix').click()
    await choiceButton(page, 'Confia').click()
    await choiceButton(page, 'Traeix').click()

    await expect(choiceButton(page, 'Traeix')).toHaveAttribute('data-glowing', 'true')
    expect(calls.choices.d1).toEqual({ anna: 'traeix' })
    expect(calls.eventCalls.filter((call) => call.fn === 'lock_in').map((call) => call.p_choice)).toEqual(['confia', 'traeix'])
    expect(most).toBe(1)
  })

  test('REQ-202: the last tap replaces the first, and the new button glows', async ({ page }) => {
    const calls = await startDuel(page, anna)
    await panelOpener(page).click()

    await choiceButton(page, 'Confia').click()
    await expect(choiceButton(page, 'Confia')).toHaveAttribute('data-glowing', 'true')
    await choiceButton(page, 'Traeix').click()

    await expect(choiceButton(page, 'Traeix')).toHaveAttribute('data-glowing', 'true')
    await expect(choiceButton(page, 'Confia')).toHaveAttribute('data-glowing', 'false')
    expect(calls.choices.d1).toEqual({ anna: 'traeix' })
  })

  test('REQ-062: a lost reply is sent again with the same request ID', async ({ page }) => {
    const calls = await startDuel(page, anna)
    const ids: string[] = []
    await page.route('**/rest/v1/rpc/lock_in', async (route) => {
      if (route.request().method() === 'OPTIONS') return route.fallback()
      ids.push(route.request().postDataJSON().p_request_id)
      return ids.length === 1 ? route.abort('connectionreset') : route.fallback()
    })
    await panelOpener(page).click()
    await choiceButton(page, 'Traeix').click()

    await expect(choiceButton(page, 'Traeix')).toHaveAttribute('data-glowing', 'true')
    expect(ids).toHaveLength(2)
    expect(ids[1]).toBe(ids[0])
    expect(calls.choices.d1).toEqual({ anna: 'traeix' })
  })

  test('REQ-019: when the retry fails too, it says so in Catalan and nothing glows', async ({ page }) => {
    const calls = await startDuel(page, anna)
    let down = true
    await page.route('**/rest/v1/rpc/lock_in', (route) =>
      down && route.request().method() !== 'OPTIONS' ? route.abort('connectionreset') : route.fallback(),
    )
    await panelOpener(page).click()
    await choiceButton(page, 'Traeix').click()

    await expect(page.getByRole('alert')).toHaveText('No hi ha connexió. Comprova la xarxa i torna-ho a provar.')
    await expect(glowing(page)).toHaveCount(0)
    expect(calls.choices.d1).toBeUndefined()

    down = false
    await choiceButton(page, 'Traeix').click()
    await expect(choiceButton(page, 'Traeix')).toHaveAttribute('data-glowing', 'true')
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})

test.describe('giving nothing away', () => {
  test('REQ-195: my resting screen is the same before and after I lock in', async ({ page }) => {
    await startDuel(page, anna)
    const before = await resting(page)

    await panelOpener(page).click()
    await choiceButton(page, 'Traeix').click()
    await expect(glowing(page)).toHaveCount(1)
    await closePanel(page)

    expect(await resting(page)).toBe(before)
  })

  test('REQ-198: the panel looks the same after I lock in, and shows no choice', async ({ page }) => {
    await startDuel(page, anna)
    await panelOpener(page).click()
    const before = await panel(page).evaluate((element) => element.outerHTML)
    await choiceButton(page, 'Traeix').click()
    await expect(glowing(page)).toHaveCount(1)
    await closePanel(page)

    await page.reload()
    await page.locator('[data-screen="esdeveniment"]').waitFor()
    await panelOpener(page).click()
    expect(await panel(page).evaluate((element) => element.outerHTML)).toBe(before)
  })

  test('REQ-195, REQ-198: two players, one locked in, see the same screens', async ({ page, browser }, info) => {
    const calls = await startDuel(page, bea)
    calls.lockInAs('d1', 'anna', 'traeix')
    await page.reload()
    await page.locator('[data-screen="esdeveniment"]').waitFor()
    await panelOpener(page).waitFor()
    const locked = await resting(page)
    await panelOpener(page).click()
    const lockedPanel = await panel(page).evaluate((element) => element.outerHTML)

    const { viewport, isMobile, hasTouch, locale, timezoneId, baseURL } = info.project.use
    const other = await browser.newContext({ viewport, isMobile, hasTouch, locale, timezoneId, baseURL })
    const otherPage = await other.newPage()
    await otherPage.goto('')
    await startDuel(otherPage, anna)
    expect(await resting(otherPage)).toBe(locked)
    await panelOpener(otherPage).click()
    expect(await panel(otherPage).evaluate((element) => element.outerHTML)).toBe(lockedPanel)
    await other.close()
  })

  test('REQ-131, REQ-194: when the other player locks in, nothing changes on my screen', async ({ page }) => {
    const calls = await startDuel(page, anna)
    const before = await resting(page)

    calls.lockInAs('d1', 'bea', 'traeix')
    const polls = calls.statePolls
    await expect.poll(() => calls.statePolls, { timeout: 8000 }).toBeGreaterThan(polls)
    await page.waitForTimeout(200)

    expect(await resting(page)).toBe(before)
  })

  test('REQ-131: nothing on the screen or in a read names a choice before the reveal', async ({ page }) => {
    const bodies: string[] = []
    page.on('response', async (response) => {
      if (response.url().includes('/rest/v1/') && response.request().method() !== 'OPTIONS') {
        bodies.push(await response.text().catch(() => ''))
      }
    })
    const calls = await startDuel(page, anna)
    calls.lockInAs('d1', 'bea', 'traeix')
    await page.reload()
    await page.locator('[data-screen="esdeveniment"]').waitFor()
    await panelOpener(page).waitFor()

    expect(bodies.join('')).not.toContain('"choice"')
    expect(await resting(page)).not.toContain('data-choice=')
  })
})

const reveal = (page: Page) => page.locator('[data-reveal]')
const revealDone = (page: Page) => page.locator('[data-reveal][data-stage="done"]')
const finished = (players: [string, string, number, number][]): Partial<FakeEvent> => ({
  status: 'completed',
  phase: 'revealed',
  reveal: {
    players: players.map(([user_id, choice, percentage, payout]) => ({ user_id, choice, percentage, payout })),
  },
})
const betrayal = finished([
  ['anna', 'traeix', 250, 27],
  ['bea', 'confia', 0, 0],
])

test.describe('waiting for the reveal', () => {
  test('REQ-134: the screen checks every few seconds, whether or not I have locked in', async ({ page }) => {
    const calls = await startDuel(page, anna)
    const polls = calls.statePolls

    await expect.poll(() => calls.statePolls, { timeout: 8000 }).toBeGreaterThanOrEqual(polls + 2)
  })

  test('REQ-134: when the other player locks in, I see the reveal without reloading', async ({ page }) => {
    const calls = await startDuel(page, anna)
    await panelOpener(page).click()
    await choiceButton(page, 'Confia').click()
    await expect(glowing(page)).toHaveCount(1)
    await closePanel(page)

    calls.lockInAs('d1', 'bea', 'traeix')

    await expect(reveal(page)).toBeVisible({ timeout: 8000 })
    await expect(page.locator('[data-screen="esdeveniment"] .pill')).toHaveText('Completat')
  })

  test('REQ-134: an open panel gives way to the reveal', async ({ page }) => {
    const calls = await startDuel(page, anna)
    await panelOpener(page).click()
    await choiceButton(page, 'Confia').click()
    await expect(glowing(page)).toHaveCount(0, { timeout: 4000 })

    calls.lockInAs('d1', 'bea', 'confia')

    await expect(reveal(page)).toBeVisible({ timeout: 8000 })
    await expect(panel(page)).toHaveCount(0)
  })

  test('REQ-134: someone watching sees the reveal too', async ({ page }) => {
    const calls = await startDuel(page, richAdmin)
    calls.lockInAs('d1', 'anna', 'confia')
    calls.lockInAs('d1', 'bea', 'confia')

    await expect(reveal(page)).toBeVisible({ timeout: 8000 })
  })

  test('REQ-134: the panel appears when the second player pays, and a cancel shows too', async ({ page }) => {
    const calls = await startDuel(page, anna, { phase: 'inviting', people: { anna: 'accepted', bea: 'invited' } })
    calls.events[0].phase = 'choosing'
    calls.events[0].people.bea = 'accepted'
    await expect(panelOpener(page)).toBeVisible({ timeout: 8000 })

    calls.events[0].status = 'cancelled'
    await expect(page.locator('[data-screen="esdeveniment"] .pill')).toHaveText('Cancel·lat', { timeout: 8000 })
  })

  test('REQ-134: a failed read waits for the next one', async ({ page }) => {
    const calls = await startDuel(page, anna)
    let failures = 0
    await page.route('**/rest/v1/rpc/game_state', (route) => {
      failures += 1
      return failures === 1 ? route.abort('connectionreset') : route.fallback()
    })
    calls.lockInAs('d1', 'anna', 'confia')
    calls.lockInAs('d1', 'bea', 'confia')

    await expect(reveal(page)).toBeVisible({ timeout: 10000 })
    expect(failures).toBeGreaterThanOrEqual(2)
  })

  test('REQ-133: the tap that completes the pair glows first, and then the reveal starts', async ({ page }) => {
    const calls = await startDuel(page, anna)
    calls.lockInAs('d1', 'bea', 'traeix')
    await panelOpener(page).click()
    await choiceButton(page, 'Confia').click()

    await expect(choiceButton(page, 'Confia')).toHaveAttribute('data-glowing', 'true')
    await expect(reveal(page)).toHaveCount(0)
    await page.waitForTimeout(1500)
    await expect(choiceButton(page, 'Confia')).toHaveAttribute('data-glowing', 'true')
    await expect(reveal(page)).toBeVisible({ timeout: 3000 })
    await expect(panel(page)).toHaveCount(0)
  })

  test('REQ-204: a tap after both have picked changes nothing, and shows the reveal with no glow', async ({ page }) => {
    const calls = await startDuel(page, anna)
    await panelOpener(page).click()
    calls.lockInAs('d1', 'anna', 'traeix')
    calls.lockInAs('d1', 'bea', 'confia')
    await choiceButton(page, 'Confia').click()

    await expect(reveal(page)).toBeVisible()
    await expect(panel(page)).toHaveCount(0)
    expect(calls.choices.d1).toEqual({ anna: 'traeix', bea: 'confia' })
    await expect(revealDone(page).or(reveal(page))).toBeVisible()
  })
})

test.describe('the reveal', () => {
  test('REQ-132: shows every choice and payout, including a payout of 0', async ({ page }) => {
    await startDuel(page, anna, betrayal)

    await expect(revealDone(page)).toBeVisible({ timeout: 8000 })
    await expect(page.locator('[data-reveal-player]')).toHaveText([/anna.*Traeix.*27 marcones/, /bea.*Confia.*0 marcones/])
    await expect(page.locator('[data-verdict]')).toHaveText('Traïció!')
    await expect(page.locator('[data-verdict-detail]')).toHaveText('anna ha traït bea.')
    await expect(page.locator('[data-game-rules]')).toBeVisible()
    await expect(page.getByRole('button', { name: "Cancel·la l'esdeveniment" })).toHaveCount(0)
  })

  test('REQ-132: says what kind of ending it was', async ({ page }) => {
    await startDuel(page, anna, finished([['anna', 'confia', 150, 16], ['bea', 'confia', 150, 16]]))
    await expect(revealDone(page)).toBeVisible({ timeout: 8000 })
    await expect(page.locator('[data-verdict]')).toHaveText('Confiança mútua')
    await expect(page.locator('[data-verdict-detail]')).toHaveCount(0)
  })

  test('REQ-132: two betrayals have their own ending', async ({ page }) => {
    await startDuel(page, anna, finished([['anna', 'traeix', 50, 5], ['bea', 'traeix', 50, 5]]))
    await expect(revealDone(page)).toBeVisible({ timeout: 8000 })
    await expect(page.locator('[data-verdict]')).toHaveText('Doble traïció')
  })

  test('REQ-133: the cards turn one at a time, and the result waits for the end', async ({ page }) => {
    await startDuel(page, bea, betrayal)

    await expect(reveal(page)).toHaveAttribute('data-stage', 'waiting')
    await expect(page.locator('[data-reveal-player]')).toHaveCount(0)
    await expect(page.locator('[data-verdict]')).toHaveCount(0)
    await expect(page.locator('[data-reveal] [data-choice]')).toHaveCount(0)

    await expect(reveal(page)).toHaveAttribute('data-stage', 'first', { timeout: 3000 })
    await expect(page.locator('[data-reveal] [data-choice]')).toHaveCount(1)

    await expect(reveal(page)).toHaveAttribute('data-stage', 'second', { timeout: 3000 })
    await expect(page.locator('[data-reveal] [data-choice]')).toHaveCount(2)
    await expect(page.locator('[data-reveal-player]')).toHaveCount(0)

    await expect(revealDone(page)).toBeVisible({ timeout: 3000 })
  })

  test('REQ-133: my own card turns first', async ({ page }) => {
    await startDuel(page, bea, betrayal)

    await expect(reveal(page)).toHaveAttribute('data-stage', 'first', { timeout: 3000 })
    await expect(page.locator('[data-reveal] [data-choice]')).toHaveAttribute('data-choice', 'confia')
    await expect(page.locator('[data-card]').first()).toContainText('bea')
  })

  test('REQ-133: a winner gets the celebration, and a loser does not', async ({ page, browser }, info) => {
    await startDuel(page, anna, betrayal)
    await expect(page.locator('[data-confetti]')).toBeAttached({ timeout: 8000 })

    const { viewport, isMobile, hasTouch, locale, timezoneId, baseURL } = info.project.use
    const other = await browser.newContext({ viewport, isMobile, hasTouch, locale, timezoneId, baseURL })
    const loser = await other.newPage()
    await loser.goto('')
    await startDuel(loser, bea, betrayal)
    await expect(revealDone(loser)).toBeVisible({ timeout: 8000 })
    expect(await loser.locator('[data-confetti]').count()).toBe(0)
    await other.close()
  })

  test('REQ-133: with reduced motion, the result shows at once, still', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await startDuel(page, anna, betrayal)

    await expect(reveal(page)).toHaveAttribute('data-stage', 'done')
    await expect(page.locator('[data-reveal-player]')).toHaveCount(2)
    expect(await page.locator('[data-confetti]').count()).toBe(0)
  })

  test('REQ-133: it plays once on this phone, and later visits go straight to the result', async ({ page }) => {
    await startDuel(page, anna, betrayal)
    await expect(revealDone(page)).toBeVisible({ timeout: 8000 })

    await page.reload()
    await expect(reveal(page)).toHaveAttribute('data-stage', 'done')
    expect(await page.locator('[data-confetti]').count()).toBe(0)
  })

  test('REQ-133: it still plays when browser storage is blocked', async ({ page }) => {
    await page.addInitScript(() => {
      const { getItem, setItem } = Storage.prototype
      Storage.prototype.getItem = function (key) {
        if (key.startsWith('marcona-reveal')) throw new Error('blocked')
        return getItem.call(this, key)
      }
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith('marcona-reveal')) throw new Error('blocked')
        setItem.call(this, key, value)
      }
    })
    await startDuel(page, anna, betrayal)
    await expect(revealDone(page)).toBeVisible({ timeout: 8000 })
  })

  test('REQ-023: the finished duel fits the phone', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await startDuel(page, anna, betrayal)
    await expect(revealDone(page)).toBeVisible()

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
  })

  test('REQ-145: the payouts are ordinary movements in the audit', async ({ page }) => {
    const calls = await startDuel(page, anna)
    await panelOpener(page).click()
    calls.lockInAs('d1', 'bea', 'confia')
    await choiceButton(page, 'Traeix').click()
    await expect(reveal(page)).toBeVisible({ timeout: 8000 })

    await page.getByRole('link', { name: 'Auditoria' }).click()
    const movement = page.locator('[data-movement]').filter({ hasText: 'anna' }).first()
    await expect(movement).toContainText('Premi')
    await expect(movement).toContainText('+27')
    await expect(movement).toContainText('El duel')
  })
})

test.describe('the events list', () => {
  test('REQ-097: a game shows its name, not a pot', async ({ page }) => {
    await start(page, anna, [duel()])

    await expect(page.locator('[data-event]').filter({ hasText: 'El duel' })).toContainText('Entrada 11 · Confia o traeix')
    await expect(page.locator('[data-event]').filter({ hasText: 'El duel' })).not.toContainText('Pot')
  })
})

test.describe('game settings', () => {
  const openSettings = async (page: Page) => {
    const calls = await start(page, richAdmin)
    await page.getByRole('link', { name: 'Administració' }).click()
    await page.locator('[data-game-settings]').waitFor()
    return calls
  }

  const save = (page: Page) => page.getByRole('button', { name: 'Desa el joc' }).click()
  const percent = (page: Page, label: string) => page.getByLabel(label, { exact: true })

  test('REQ-147: shows the current description and numbers', async ({ page }) => {
    await openSettings(page)

    await expect(page.getByRole('checkbox', { name: 'Joc actiu' })).toBeChecked()
    await expect(page.getByLabel('Descripció')).toHaveValue('Dues persones, una decisió secreta.')
    await expect(percent(page, 'Totes dues confien (%)')).toHaveValue('150')
    await expect(percent(page, 'Qui traeix (%)')).toHaveValue('250')
    await expect(percent(page, 'Qui confia i rep la traïció (%)')).toHaveValue('0')
    await expect(percent(page, 'Totes dues traeixen (%)')).toHaveValue('50')
  })

  test('REQ-148: the worked example updates as the numbers change', async ({ page }) => {
    await openSettings(page)
    const example = page.locator('[data-game-settings] [data-payoff]')
    await expect(page.locator('[data-worked-example]')).toContainText('Exemple amb una entrada de 10 marcones')
    await expect(example.first()).toContainText('Cada persona rep 15 marcones (150%)')

    await percent(page, 'Totes dues confien (%)').fill('125')
    await expect(example.first()).toContainText('Cada persona rep 12 marcones (125%)')

    await percent(page, 'Qui traeix (%)').fill('333')
    await expect(example.nth(1)).toContainText('Qui traeix rep 33 marcones (333%)')
  })

  test('REQ-148: a number that makes no sense pauses the example, with no crash', async ({ page }) => {
    await openSettings(page)
    await percent(page, 'Totes dues confien (%)').fill('abc')

    await expect(page.locator('[data-game-settings] [data-payoff]')).toHaveCount(0)
    await expect(page.locator('[data-worked-example]')).toContainText('Escriu nombres enters')
    await percent(page, 'Totes dues confien (%)').fill('130')
    await expect(page.locator('[data-game-settings] [data-payoff]').first()).toContainText('13 marcones')
  })

  test('REQ-144: an order that breaks the rule shows a Catalan error, and nothing changes', async ({ page }) => {
    const calls = await openSettings(page)
    await percent(page, 'Totes dues traeixen (%)').fill('200')
    await save(page)

    await expect(page.getByRole('alert')).toHaveText(
      'Els percentatges han de complir: qui traeix > totes dues confien > totes dues traeixen ≥ qui rep la traïció.',
    )
    expect(calls.games[0].settings.both_betray).toBe(50)
  })

  test('REQ-144: a number out of range shows a Catalan error', async ({ page }) => {
    await openSettings(page)
    await percent(page, 'Qui traeix (%)').fill('1001')
    await save(page)

    await expect(page.getByRole('alert')).toHaveText('Cada percentatge ha de ser un nombre enter del 0 al 1.000.')
  })

  test('REQ-147: saves the Catalan description and the numbers for new events', async ({ page }) => {
    const calls = await openSettings(page)
    await page.getByLabel('Descripció').fill('Regles noves.')
    await percent(page, 'Totes dues confien (%)').fill('120')
    await save(page)

    await expect(page.getByRole('status')).toHaveText("S'han desat els canvis del joc per als nous esdeveniments.")
    expect(calls.games[0]).toMatchObject({ description: 'Regles noves.', settings: { both_trust: 120 } })

    await page.getByRole('link', { name: 'Esdeveniments' }).click()
    await openForm(page)
    await fillDuel(page, ['anna'])
    await submit(page)
    await page.locator('[data-screen="esdeveniment"]').waitFor()
    await expect(page.locator('[data-game-rules]')).toContainText('Regles noves.')
    await expect(page.locator('[data-payoff]').first()).toContainText('12 marcones (120%)')
  })

  test('REQ-146: turning a game off takes it out of the new event form', async ({ page }) => {
    await openSettings(page)
    await page.getByRole('checkbox', { name: 'Joc actiu' }).uncheck({ force: true })
    await save(page)
    await expect(page.getByRole('status')).toBeVisible()

    await page.getByRole('link', { name: 'Esdeveniments' }).click()
    await openForm(page)
    await expect(page.getByLabel('Tipus').locator('option')).toHaveText(['Clàssic'])
  })

  test('REQ-023: the settings fit the phone', async ({ page }) => {
    await openSettings(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
  })
})
