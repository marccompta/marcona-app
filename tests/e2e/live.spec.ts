import { expect, test, type Page } from '@playwright/test'
import { admin, fakeSupabase, logIn, player, type FakeEvent, type FakeMovement, type FakeUser } from './fake-supabase'

// Live updates through the fake Realtime socket. Each test marks the page first,
// so a reload would lose the mark and fail the check at the end.
const bea: FakeUser = { username: 'bea', password: 'x', role: 'player', balance: 30 }
const people: FakeUser[] = [{ ...admin, balance: 50 }, { ...player, balance: 20 }, bea]
const history: FakeMovement[] = [{ username: 'anna', delta: 20, balance_after: 20, concept: 'Benvinguda' }]

const markPage = (page: Page) => page.evaluate(() => ((window as unknown as { stayed: boolean }).stayed = true))
const stayed = (page: Page) => page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed === true)

async function joined(calls: Awaited<ReturnType<typeof fakeSupabase>>, table: string) {
  await expect.poll(() => calls.channels.some((channel) => !channel.left && channel.tables.includes(table))).toBe(true)
}

test.beforeEach(async ({ page }) => {
  await page.goto('')
})

test('REQ-150: the ranking moves when someone else changes a balance', async ({ page }) => {
  const calls = await fakeSupabase(page, people, history)
  await logIn(page, player)
  await joined(calls, 'profiles')
  await expect(page.locator('.rank-username')).toHaveText(['marc', 'bea', 'anna'])
  await markPage(page)

  calls.adjustAs('anna', 40)

  await expect(page.locator('.rank-username')).toHaveText(['anna', 'marc', 'bea'])
  await expect(page.locator('[data-rank="1"] .rank-amount')).toHaveText('60')
  expect(await stayed(page)).toBe(true)
})

test('REQ-151: the audit shows a new movement when it happens', async ({ page }) => {
  const calls = await fakeSupabase(page, people, history)
  await logIn(page, player)
  await page.getByRole('link', { name: 'Auditoria' }).click()
  await joined(calls, 'ledger')
  await expect(page.locator('[data-movement]')).toHaveCount(1)
  await markPage(page)

  calls.adjustAs('bea', 5, 'Ronda de cafès')

  await expect(page.locator('[data-movement]')).toHaveCount(2)
  await expect(page.locator('.movement-label').first()).toHaveText('Ronda de cafès')
  expect(await stayed(page)).toBe(true)
})

test('REQ-151: the audit filter keeps its choice when a movement arrives', async ({ page }) => {
  const calls = await fakeSupabase(page, people, history)
  await logIn(page, player)
  await page.getByRole('link', { name: 'Auditoria' }).click()
  await joined(calls, 'ledger')
  await page.getByLabel('Persona').selectOption({ label: 'bea' })
  await expect(page.locator('[data-movement]')).toHaveCount(0)

  calls.adjustAs('bea', 5, 'Per a la bea')
  calls.adjustAs('anna', 1, 'Per a l’anna')

  await expect(page.locator('.movement-label')).toHaveText(['Per a la bea'])
  await expect(page.getByLabel('Persona')).toHaveValue('bea')
})

test('REQ-150, REQ-151: a person’s balance and movements follow along', async ({ page }) => {
  const calls = await fakeSupabase(page, people, history)
  await logIn(page, player)
  await page.getByRole('link', { name: /anna/ }).click()
  await joined(calls, 'ledger')
  await expect(page.locator('.detail-amount')).toHaveText('20')
  await markPage(page)

  calls.adjustAs('anna', -5, 'Correcció')

  await expect(page.locator('.detail-amount')).toHaveText('15')
  await expect(page.locator('[data-movement]')).toHaveCount(2)
  expect(await stayed(page)).toBe(true)
})

test('REQ-150: a change missed while the connection was down shows when the phone wakes', async ({ page }) => {
  const calls = await fakeSupabase(page, people, history)
  await logIn(page, player)
  await joined(calls, 'profiles')
  // Subscribing reads once more. Let that finish before the connection drops.
  await page.waitForTimeout(500)
  calls.live = false
  calls.adjustAs('anna', 100)
  await page.waitForTimeout(500)
  expect(await page.locator('[data-rank="1"] .rank-username').textContent()).toBe('marc')

  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))

  await expect(page.locator('[data-rank="1"] .rank-username')).toHaveText('anna')
})

test('REQ-150: a screen stops listening once it closes', async ({ page }) => {
  const calls = await fakeSupabase(page, people, history)
  await logIn(page, player)
  await joined(calls, 'profiles')
  await page.getByRole('link', { name: 'Ruleta' }).click()
  await page.locator('[data-screen="ruleta"]').waitFor()

  await expect.poll(() => calls.channels.filter((channel) => !channel.left)).toEqual([])
})

test.describe('events', () => {
  const host: FakeUser = { ...admin, balance: 100 }
  const anna: FakeUser = { ...player, balance: 100 }
  const guest: FakeUser = { ...bea, balance: 100 }
  const dinner: FakeEvent = { id: 'e1', name: 'Sopar', buy_in: 10, creator: 'marc', people: { anna: 'accepted', bea: 'invited' } }
  const duel: FakeEvent = {
    id: 'd1',
    name: 'El duel',
    buy_in: 10,
    creator: 'marc',
    game: 'confia_o_traeix',
    phase: 'choosing',
    creator_plays: false,
    people: { anna: 'accepted', bea: 'accepted' },
  }

  const open = async (page: Page, user: FakeUser, events: FakeEvent[], name?: string) => {
    const calls = await fakeSupabase(page, [host, anna, guest].map((u) => (u.username === user.username ? user : u)), [], events)
    await logIn(page, user)
    await page.getByRole('link', { name: 'Esdeveniments' }).click()
    await page.locator('[data-screen="esdeveniments"]').waitFor()
    if (name) {
      await page.locator('[data-event]').filter({ hasText: name }).click()
      await page.locator('[data-screen="esdeveniment"]').waitFor()
    }
    await joined(calls, 'event_participants')
    // Subscribing reads once more. Let that finish first.
    await page.waitForTimeout(500)
    await markPage(page)
    return calls
  }

  // Polling would also find a duel's reveal, so these tests stop it answering.
  const noPolling = (page: Page) => page.route('**/rest/v1/rpc/game_state', () => {})

  const pill = (page: Page) => page.locator('[data-screen="esdeveniment"] .pill')
  const reveal = (page: Page) => page.locator('[data-reveal]')

  test('REQ-152: the list shows a new invitation and an accepted one as they happen', async ({ page }) => {
    const calls = await open(page, anna, [dinner])
    const row = page.locator('[data-event]').filter({ hasText: 'Sopar' })
    await expect(row).toContainText('Pot 20')

    calls.actAs('bea', 'answer_invitation', { p_request_id: 'r1', p_event_id: 'e1', p_accept: true })
    await expect(row).toContainText('Pot 30')

    calls.actAs('marc', 'create_event', {
      p_request_id: 'r2',
      p_name: 'Partida nova',
      p_buy_in: 5,
      p_invitees: ['anna'],
      p_payout_first: 100,
      p_payout_second: 0,
      p_payout_third: 0,
      p_force: false,
    })
    await expect(page.locator('[data-group="invitacions"] [data-event]')).toHaveText([/Partida nova/])
    expect(await stayed(page)).toBe(true)
  })

  test('REQ-152: an event screen shows someone accepting, then the results', async ({ page }) => {
    const calls = await open(page, anna, [dinner], 'Sopar')
    const bea = page.locator('[data-participant]').filter({ hasText: 'bea' })
    await expect(bea).toContainText('Pendent')

    calls.actAs('bea', 'answer_invitation', { p_request_id: 'r1', p_event_id: 'e1', p_accept: true })
    await expect(bea).toContainText('Hi participa')
    await expect(page.locator('[data-fact="pot"]')).toHaveText('30 marcones')

    calls.actAs('marc', 'complete_event', { p_request_id: 'r2', p_event_id: 'e1', p_first: 'anna', p_second: 'bea', p_third: 'marc' })
    await expect(pill(page)).toHaveText('Completat')
    await expect(page.locator('[data-place]')).toHaveCount(3)
    expect(await stayed(page)).toBe(true)
  })

  test('REQ-152: an event screen ignores changes to other events', async ({ page }) => {
    const calls = await open(page, anna, [dinner, { ...dinner, id: 'e2', name: 'Esmorzar' }], 'Sopar')
    const before = calls.messages.length
    calls.actAs('bea', 'answer_invitation', { p_request_id: 'r1', p_event_id: 'e2', p_accept: true })
    expect(calls.messages.length).toBeGreaterThan(before)
    await page.waitForTimeout(500)
    expect(await page.locator('[data-participant]').filter({ hasText: 'bea' }).textContent()).toContain('Pendent')
  })

  test('REQ-152: a duel shows a player paying at once, and the panel opens up', async ({ page }) => {
    await noPolling(page)
    const calls = await open(page, anna, [{ ...duel, phase: 'inviting', people: { anna: 'accepted', bea: 'invited' } }], 'El duel')
    await expect(page.locator('[data-participant]').filter({ hasText: 'bea' })).toContainText('Pendent')

    calls.actAs('bea', 'answer_invitation', { p_request_id: 'r1', p_event_id: 'd1', p_accept: true })

    await expect(page.locator('[data-participant]').filter({ hasText: 'bea' })).toContainText('Hi participa')
    await expect(page.getByRole('button', { name: 'Tria en privat' })).toBeVisible()
  })

  test('REQ-152: someone watching a duel sees the reveal as soon as it happens', async ({ page }) => {
    await noPolling(page)
    const calls = await open(page, host, [duel], 'El duel')

    calls.lockInAs('d1', 'anna', 'confia')
    calls.lockInAs('d1', 'bea', 'traeix')

    await expect(reveal(page)).toBeVisible({ timeout: 2000 })
    expect(await stayed(page)).toBe(true)
  })

  test('REQ-152, REQ-133: the tap that completes the pair still glows before the reveal', async ({ page }) => {
    await noPolling(page)
    const calls = await open(page, anna, [duel], 'El duel')
    calls.lockInAs('d1', 'bea', 'traeix')
    await page.getByRole('button', { name: 'Tria en privat' }).click()
    await page.locator('[data-choice-panel]').getByRole('button', { name: 'Confia' }).click()

    // The reveal's Realtime message arrives at once. It must wait for the glow.
    await expect.poll(() => calls.messages.some((message) => message.table === 'events' && message.record.id === 'd1')).toBe(true)
    await page.waitForTimeout(400)
    expect(await reveal(page).count()).toBe(0)
    await expect(reveal(page)).toBeVisible({ timeout: 3000 })
  })
})
