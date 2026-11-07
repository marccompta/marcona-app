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
