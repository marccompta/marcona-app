import { expect, test, type Page } from '@playwright/test'
import { admin, fakeSupabase, logIn, minoriaGame, player, type FakeEvent, type FakeUser } from './fake-supabase'

// La minoria's screens. The rules and payouts are tested in tests/sql/minoria.sql.

const richAdmin = { ...admin, balance: 100 }
const anna = { ...player, balance: 100 }
const bea: FakeUser = { username: 'bea', password: 'x', role: 'player', balance: 50 }
const cesc: FakeUser = { username: 'cesc', password: 'x', role: 'player', balance: 50 }

const game = (fields: Partial<FakeEvent> = {}): FakeEvent => ({
  id: 'm1',
  name: 'La gran minoria',
  buy_in: 10,
  creator: 'marc',
  game: 'la_minoria',
  phase: 'choosing',
  creator_plays: false,
  people: { anna: 'accepted', bea: 'accepted', cesc: 'accepted' },
  ...fields,
})

const start = async (page: Page, user: FakeUser, events: FakeEvent[] = []) => {
  const others = [richAdmin, anna, bea, cesc].filter((other) => other.username !== user.username)
  const calls = await fakeSupabase(page, [user, ...others], [], events)
  calls.games.push(minoriaGame())
  await logIn(page, user)
  await page.getByRole('link', { name: 'Esdeveniments' }).click()
  await page.locator('[data-screen="esdeveniments"]').waitFor()
  return calls
}

const openGame = async (page: Page, user: FakeUser, fields: Partial<FakeEvent> = {}) => {
  const calls = await start(page, user, [game(fields)])
  await page.locator('[data-event]').filter({ hasText: 'La gran minoria' }).click()
  await page.locator('[data-minoria]').waitFor()
  return calls
}

const panelOpener = (page: Page) => page.getByRole('button', { name: 'Tria en privat' })
const panel = (page: Page) => page.locator('[data-choice-panel]')
const option = (page: Page, name: string) => panel(page).getByRole('button', { name, exact: true })
const confirm = (page: Page) => panel(page).getByRole('button', { name: /^Confirma/ })
const person = (page: Page, username: string) => page.locator('[data-participant]').filter({ hasText: username })
const startButton = (page: Page) => page.getByRole('button', { name: 'Comença el joc' })
const reveal = (page: Page) => page.locator('[data-reveal]')

test.beforeEach(async ({ page }) => {
  await page.goto('')
})

test.describe('creating La minoria', () => {
  const openForm = async (page: Page) => {
    await page.getByRole('link', { name: 'Nou esdeveniment' }).click()
    await page.locator('[data-screen="nou-esdeveniment"]').waitFor()
    await page.getByLabel('Tipus').selectOption({ label: 'La minoria' })
  }

  test('REQ-155, REQ-185: the form says how many to invite, counting the admin who plays', async ({ page }) => {
    await start(page, richAdmin)
    await openForm(page)

    await expect(page.locator('[data-invite-hint]')).toHaveText('Almenys 2 persones: amb tu, sou 3.')
    await page.getByRole('checkbox', { name: 'Hi jugo' }).uncheck({ force: true })
    await expect(page.locator('[data-invite-hint]')).toHaveText('Almenys 3 persones.')
  })

  test('REQ-155: the admin creates it and lands on its screen', async ({ page }) => {
    const calls = await start(page, richAdmin)
    await openForm(page)
    await page.getByLabel('Nom').fill('La gran minoria')
    await page.getByLabel('Entrada').fill('10')
    for (const name of ['anna', 'bea']) await page.getByRole('checkbox', { name, exact: true }).check({ force: true })
    await page.getByRole('button', { name: "Crea l'esdeveniment" }).click()

    await page.locator('[data-minoria]').waitFor()
    expect(calls.eventCalls.find((call) => call.fn === 'create_game_event')).toMatchObject({
      p_game: 'la_minoria',
      p_plays: true,
      p_invitees: ['anna', 'bea'],
    })
  })

  test('REQ-185: too few players are refused in Catalan', async ({ page }) => {
    await start(page, richAdmin)
    await openForm(page)
    await page.getByRole('checkbox', { name: 'Hi jugo' }).uncheck({ force: true })
    await page.getByLabel('Nom').fill('Massa poca gent')
    await page.getByLabel('Entrada').fill('10')
    for (const name of ['anna', 'bea']) await page.getByRole('checkbox', { name, exact: true }).check({ force: true })
    await page.getByRole('button', { name: "Crea l'esdeveniment" }).click()

    await expect(page.getByRole('alert')).toHaveText('La minoria necessita almenys 3 persones que hi juguin.')
  })
})

test.describe('starting La minoria', () => {
  test('REQ-156, REQ-158: the creator starts it, and a pending invitation lapses', async ({ page }) => {
    const calls = await openGame(page, richAdmin, {
      phase: 'inviting',
      creator_plays: true,
      people: { marc: 'accepted', anna: 'accepted', bea: 'accepted', cesc: 'invited' },
    })

    await expect(page.locator('[data-start-hint]')).toHaveText('Ja hi ha 3 persones a dins. Si comences, les invitacions pendents caduquen.')
    await startButton(page).click()

    await expect(startButton(page)).toHaveCount(0)
    await expect(person(page, 'cesc')).toContainText('Invitació caducada')
    expect(calls.events[0]).toMatchObject({ phase: 'choosing', people: { cesc: 'lapsed' } })
    await expect(panelOpener(page)).toBeVisible()
  })

  test('REQ-157, REQ-185: with fewer than 3 in, the start waits', async ({ page }) => {
    await openGame(page, richAdmin, { phase: 'inviting', people: { anna: 'accepted', bea: 'accepted', cesc: 'invited' } })

    await expect(startButton(page)).toBeDisabled()
    await expect(page.locator('[data-start-hint]')).toHaveText('Ja hi ha 2 persones a dins. En calen almenys 3 per començar.')
  })

  test('REQ-157: nobody else is offered the start', async ({ page }) => {
    await openGame(page, anna, { phase: 'inviting', people: { anna: 'accepted', bea: 'accepted', cesc: 'accepted' } })

    await expect(page.locator('[data-game-waiting]')).toBeVisible()
    await expect(startButton(page)).toHaveCount(0)
  })

  test('REQ-192: a forced game opens straight on the choosing', async ({ page }) => {
    await openGame(page, anna)

    await expect(startButton(page)).toHaveCount(0)
    await expect(panelOpener(page)).toBeVisible()
  })
})

test.describe('picking a side', () => {
  test('REQ-193: two options, Blanc and Negre by default, and nothing is sent until I confirm', async ({ page }) => {
    const calls = await openGame(page, anna)
    await panelOpener(page).click()

    await expect(panel(page).locator('.choice-button')).toHaveText(['Blanc', 'Negre'])
    await expect(confirm(page)).toBeDisabled()
    await option(page, 'Negre').click()
    await expect(option(page, 'Negre')).toHaveAttribute('aria-pressed', 'true')
    await expect(option(page, 'Blanc')).toHaveAttribute('aria-pressed', 'false')
    expect(calls.eventCalls.filter((call) => call.fn === 'lock_in')).toHaveLength(0)

    await confirm(page).click()
    await expect(panel(page).locator('[data-my-choice]')).toHaveText('La teva tria: Negre. Ja no es pot canviar.')
    expect(calls.choices.m1).toEqual({ anna: 'b' })
    await expect(panel(page).locator('.choice-button')).toHaveCount(0)
  })

  test('REQ-160: a game uses the labels it was created with', async ({ page }) => {
    await openGame(page, anna, { settings: { option_a: 'Cara', option_b: 'Creu', description: 'Regles.' } })
    await panelOpener(page).click()

    await expect(panel(page).locator('.choice-button')).toHaveText(['Cara', 'Creu'])
    await expect(page.locator('[data-options]')).toHaveText('Les opcions són Cara i Creu.')
  })

  test('REQ-205: once locked in, the panel only shows my choice', async ({ page }) => {
    const calls = await start(page, anna, [game()])
    calls.lockInAs('m1', 'anna', 'a')
    await page.locator('[data-event]').filter({ hasText: 'La gran minoria' }).click()
    await panelOpener(page).click()

    await expect(panel(page).locator('[data-my-choice]')).toHaveText('La teva tria: Blanc. Ja no es pot canviar.')
    await expect(panel(page).locator('.choice-button')).toHaveCount(0)
  })

  test('REQ-205: a choice made on another phone wins, and the refusal says so', async ({ page }) => {
    const calls = await openGame(page, anna)
    await panelOpener(page).click()
    await option(page, 'Negre').click()
    calls.lockInAs('m1', 'anna', 'a')
    await confirm(page).click()

    await expect(panel(page).getByRole('alert')).toHaveText('Ja has triat, i la tria no es pot canviar.')
    await expect(panel(page).locator('[data-my-choice]')).toHaveText('La teva tria: Blanc. Ja no es pot canviar.')
    expect(calls.choices.m1).toEqual({ anna: 'a' })
  })

  test('REQ-197: everyone sees who has locked in, and never a choice', async ({ page }) => {
    const calls = await openGame(page, bea)
    await expect(person(page, 'anna')).toContainText('Triant')
    await expect(person(page, 'anna')).toHaveAttribute('data-locked', 'false')

    calls.lockInAs('m1', 'anna', 'b')
    await expect(person(page, 'anna')).toContainText('Ha triat', { timeout: 8000 })
    await expect(person(page, 'anna')).toHaveAttribute('data-locked', 'true')
    await expect(person(page, 'cesc')).toContainText('Triant')
    expect(await page.locator('.event-people').innerText()).not.toMatch(/Blanc|Negre/)
    expect(await page.locator('[data-screen="esdeveniment"]').innerHTML()).not.toMatch(/data-tone="b"|"b"/)
  })

  test('REQ-197: my own lock-in shows on the screen at once', async ({ page }) => {
    await openGame(page, anna)
    await panelOpener(page).click()
    await option(page, 'Blanc').click()
    await confirm(page).click()
    await panel(page).locator('[data-my-choice]').waitFor()
    await panel(page).getByRole('button', { name: 'Tanca' }).click()

    await expect(person(page, 'anna')).toHaveAttribute('data-locked', 'true')
    await expect(page.locator('[data-game-waiting]')).toHaveText('Ja has triat. Falta que tothom triï.')
  })

  test('REQ-127: the last pick shows the reveal', async ({ page }) => {
    const calls = await openGame(page, anna)
    calls.lockInAs('m1', 'bea', 'a')
    calls.lockInAs('m1', 'cesc', 'b')
    await panelOpener(page).click()
    await option(page, 'Blanc').click()
    await confirm(page).click()

    await expect(panel(page)).toHaveCount(0)
    await expect(reveal(page)).toBeVisible()
    await expect(page.locator('[data-reveal][data-stage="done"]')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('[data-verdict]')).toHaveText('Guanya Negre')
  })
})

test.describe('the reveal', () => {
  const revealed = (players: [string, 'a' | 'b', number][], fields: Record<string, unknown>) =>
    game({
      status: 'completed',
      phase: 'revealed',
      reveal: {
        verdict: 'split',
        minority: null,
        share: null,
        remainder_to: null,
        ...fields,
        players: players.map(([user_id, choice, payout]) => ({ user_id, choice, payout })),
      } as FakeEvent['reveal'],
      people: Object.fromEntries(players.map(([username]) => [username, 'accepted' as const])),
    })

  const split = revealed(
    [
      ['anna', 'a', 13],
      ['bea', 'b', 0],
      ['cesc', 'a', 12],
      ['marc', 'b', 0],
      ['dani', 'b', 0],
    ],
    { verdict: 'split', minority: 'a', share: 12, remainder_to: 'anna' },
  )

  test('REQ-132, REQ-161, REQ-162: shows the smaller side, every payout and who got the remainder', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await start(page, cesc, [split])
    await page.locator('[data-event]').filter({ hasText: 'La gran minoria' }).click()

    await expect(page.locator('[data-verdict]')).toHaveText('Guanya Blanc')
    await expect(page.locator('[data-verdict-detail]')).toHaveText('2 contra 3. El bàndol més petit es reparteix el pot.')
    await expect(page.locator('[data-reveal-player]')).toHaveText([
      /anna.*Blanc.*13 marcones.*residu/,
      /cesc.*Blanc.*12 marcones/,
      /bea.*Negre.*0 marcones/,
      /dani.*Negre.*0 marcones/,
      /marc.*Negre.*0 marcones/,
    ])
    await expect(page.locator('[data-reveal-player]').filter({ hasText: 'residu' })).toHaveCount(1)
  })

  test('REQ-163: a tie and a unanimous choice say everyone gets their buy-in back', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const tie = revealed(
      [
        ['anna', 'a', 10],
        ['bea', 'b', 10],
      ],
      { verdict: 'tie' },
    )
    const all = {
      ...revealed(
        [
          ['anna', 'b', 10],
          ['bea', 'b', 10],
          ['cesc', 'b', 10],
        ],
        { verdict: 'unanimous' },
      ),
      id: 'm2',
      name: 'Tots iguals',
    }
    await start(page, anna, [tie, all])
    await page.locator('[data-event]').filter({ hasText: 'La gran minoria' }).click()
    await expect(page.locator('[data-verdict]')).toHaveText('Empat')
    await expect(page.locator('[data-verdict-detail]')).toHaveText("1 contra 1. Es retorna l'entrada a tothom.")

    await page.getByRole('link', { name: 'Esdeveniments' }).first().click()
    await page.locator('[data-event]').filter({ hasText: 'Tots iguals' }).click()
    await expect(page.locator('[data-verdict]')).toHaveText('Tothom ha triat Negre')
    await expect(page.locator('[data-verdict-detail]')).toHaveText("Es retorna l'entrada a tothom.")
  })

  test('REQ-133: the sides turn before the result shows', async ({ page }) => {
    await start(page, cesc, [split])
    await page.locator('[data-event]').filter({ hasText: 'La gran minoria' }).click()

    await expect(reveal(page)).toHaveAttribute('data-stage', 'waiting')
    expect(await page.locator('[data-verdict]').count()).toBe(0)
    expect(await page.locator('[data-reveal-player]').count()).toBe(0)
    await expect(reveal(page)).toHaveAttribute('data-stage', 'turned', { timeout: 3000 })
    await expect(page.locator('[data-reveal] [data-side-count]')).toHaveText(['2', '3'])
    await expect(page.locator('[data-reveal][data-stage="done"]')).toBeVisible({ timeout: 4000 })
  })
})
