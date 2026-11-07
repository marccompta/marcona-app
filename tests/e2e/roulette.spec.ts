import { expect, test, type Page } from '@playwright/test'
import { admin, fakeSupabase, logIn, player, type FakeUser } from './fake-supabase'

// The spin animation has its own file section below. Everything else runs with
// reduced motion, so it doesn't wait for the wheel.
test.use({ reducedMotion: 'reduce' })

const openTable = async (page: Page, balance = 100, user: FakeUser = player) => {
  const me = { ...user, balance }
  const other = user.username === admin.username ? player : admin
  const calls = await fakeSupabase(page, [me, other])
  await page.goto('')
  await logIn(page, me)
  await page.getByRole('link', { name: 'Ruleta' }).click()
  // Not just the screen: a test may change the fake once the table has loaded.
  await page.locator('[data-wheel]').waitFor()
  return calls
}

const spin = async (page: Page, colour: 'Vermell' | 'Negre', bet: string) => {
  await page.getByRole('button', { name: colour }).click()
  await page.getByLabel('Aposta', { exact: true }).fill(bet)
  await page.getByRole('button', { name: 'Gira' }).click()
}

const balance = (page: Page) => page.locator('[data-balance] .count')

test.describe('the table', () => {
  test('REQ-101: roulette has its own tab, and no placeholder is left', async ({ page }) => {
    await openTable(page)

    await expect(page.getByRole('link', { name: 'Ruleta' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { name: 'Ruleta' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Gira' })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('arribarà aviat')
  })

  for (const [marcones, maximum] of [
    [100, '5 marcones'],
    [39, '1 marcona'],
    [1, '1 marcona'],
  ] as const) {
    test(`REQ-108, REQ-109: with ${marcones} marcones the maximum shown is ${maximum}`, async ({ page }) => {
      await openTable(page, marcones)
      await expect(page.locator('[data-max-bet]')).toHaveText(`Aposta màxima: ${maximum}`)
    })
  }

  test('REQ-102: only red and black can be chosen, and one is always picked', async ({ page }) => {
    await openTable(page)

    await expect(page.getByRole('button', { name: 'Blanc' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Vermell' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Negre' }).click()
    await expect(page.getByRole('button', { name: 'Negre' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Vermell' })).toHaveAttribute('aria-pressed', 'false')
  })
})

test.describe('a spin', () => {
  test('REQ-102, REQ-105: a win pays the bet, and the screen says so', async ({ page }) => {
    const calls = await openTable(page)
    await spin(page, 'Vermell', '5')

    await expect(page.locator('[data-result="red"]')).toContainText('Vermell')
    await expect(page.locator('[data-result="red"]')).toContainText('Guanyes 5 marcones')
    await expect(balance(page)).toHaveAttribute('data-value', '105')
    expect(calls.eventCalls).toMatchObject([{ fn: 'spin', p_choice: 'red', p_bet: 5 }])
  })

  for (const [result, shown] of [
    ['black', 'Negre'],
    ['white', 'Blanc'],
  ] as const) {
    test(`REQ-106: ${result} takes a bet on red`, async ({ page }) => {
      const calls = await openTable(page)
      calls.spinResults.push(result)
      await spin(page, 'Vermell', '5')

      await expect(page.locator(`[data-result="${result}"]`)).toContainText(shown)
      await expect(page.locator(`[data-result="${result}"]`)).toContainText('Perds 5 marcones')
      await expect(balance(page)).toHaveAttribute('data-value', '95')
    })
  }

  test('REQ-108, REQ-109: the maximum follows the new balance', async ({ page }) => {
    await openTable(page, 1000)
    await expect(page.locator('[data-max-bet]')).toHaveText('Aposta màxima: 50 marcones')
    await spin(page, 'Vermell', '50')
    await expect(page.locator('[data-max-bet]')).toHaveText('Aposta màxima: 52 marcones')
  })

  test('REQ-111: the audit shows the choice and the result', async ({ page }) => {
    const calls = await openTable(page)
    calls.spinResults.push('white')
    await spin(page, 'Negre', '3')
    await page.locator('[data-result]').first().waitFor()

    await page.getByRole('link', { name: 'Auditoria' }).click()
    const row = page.locator('[data-movement]').first()
    await expect(row).toContainText('Ruleta: aposta a negre, ha sortit blanc')
    await expect(row).toContainText('-3')
    expect(calls.ledger).toHaveLength(1)
  })

  test('REQ-102: a lost connection keeps the request, so a retry cannot spin twice', async ({ page }) => {
    const calls = await openTable(page)
    let dropped = false
    await page.route('**/rest/v1/rpc/spin', async (route) => {
      if (route.request().method() === 'POST' && !dropped) {
        dropped = true
        calls.eventCalls.push({ fn: 'dropped', ...route.request().postDataJSON() })
        return route.abort()
      }
      return route.fallback()
    })

    await spin(page, 'Vermell', '5')
    await expect(page.getByRole('alert')).toContainText('Torna-ho a provar')
    await page.getByRole('button', { name: 'Gira' }).click()
    await expect(page.locator('[data-result="red"]')).toBeVisible()

    const [first, second] = calls.eventCalls
    expect(second.p_request_id).toBe(first.p_request_id)
  })

  test('REQ-102: every new spin gets a new request', async ({ page }) => {
    const calls = await openTable(page)
    await spin(page, 'Vermell', '1')
    await expect(balance(page)).toHaveAttribute('data-value', '101')
    await page.getByRole('button', { name: 'Gira' }).click()
    await expect(balance(page)).toHaveAttribute('data-value', '102')

    const [first, second] = calls.eventCalls
    expect(second.p_request_id).not.toBe(first.p_request_id)
  })

  test('REQ-102: changing the bet after a failure starts a new request', async ({ page }) => {
    const calls = await openTable(page)
    await spin(page, 'Vermell', '50')
    await expect(page.getByRole('alert')).toBeVisible()
    await spin(page, 'Vermell', '5')
    await expect(balance(page)).toHaveAttribute('data-value', '105')

    const [first, second] = calls.eventCalls
    expect(second.p_request_id).not.toBe(first.p_request_id)
  })
})

test.describe('a refused spin', () => {
  for (const bet of ['0', '1.5', '', 'molt']) {
    test(`REQ-107: a bet of "${bet}" shows Catalan and changes nothing`, async ({ page }) => {
      const calls = await openTable(page)
      await spin(page, 'Vermell', bet)

      await expect(page.getByRole('alert')).toHaveText("L'aposta ha de ser un nombre enter d'1 o més.")
      await expect(balance(page)).toHaveAttribute('data-value', '100')
      expect(calls.ledger).toHaveLength(0)
    })
  }

  test('REQ-110: a bet above the maximum shows Catalan', async ({ page }) => {
    await openTable(page)
    await spin(page, 'Vermell', '6')
    await expect(page.getByRole('alert')).toHaveText("L'aposta supera el màxim que pots apostar ara.")
    await expect(balance(page)).toHaveAttribute('data-value', '100')
  })

  test('REQ-110: with no marcones the spin is refused', async ({ page }) => {
    await openTable(page, 0)
    await spin(page, 'Vermell', '1')
    await expect(page.getByRole('alert')).toHaveText('El saldo no té prou marcones.')
  })
})

test.describe('a closed table', () => {
  test('REQ-118: the tab stays, with a Catalan message and no way to spin', async ({ page }) => {
    const me = { ...player, balance: 100 }
    const calls = await fakeSupabase(page, [me, admin])
    calls.roulette.enabled = false
    await page.goto('')
    await logIn(page, me)
    await page.getByRole('link', { name: 'Ruleta' }).click()

    await expect(page.locator('[data-screen="ruleta"]')).toContainText('La taula està tancada')
    await expect(page.getByRole('button', { name: 'Gira' })).toHaveCount(0)
  })

  test('REQ-118: closing mid-visit refuses the spin, and the screen catches up', async ({ page }) => {
    const calls = await openTable(page)
    calls.roulette.enabled = false
    await spin(page, 'Vermell', '1')

    await expect(page.locator('[data-screen="ruleta"]')).toContainText('La taula està tancada')
    await expect(page.getByRole('button', { name: 'Gira' })).toHaveCount(0)
    expect(calls.ledger).toHaveLength(0)
  })
})

const wheel = (page: Page) => page.locator('[data-wheel]')
const turning = /^(spinning|settling)$/
const angle = (page: Page) => page.locator('.wheel-disc').evaluate((disc) => (disc as unknown as SVGElement).style.transform)

// Holds the server's answer to a spin until release() is called.
async function holdSpin(page: Page) {
  let release = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/rest/v1/rpc/spin', async (route) => {
    await held
    await route.fallback()
  })
  return release
}

test.describe('the animation', () => {
  test.use({ reducedMotion: 'no-preference' })

  for (const result of ['red', 'black', 'white'] as const) {
    test(`REQ-112: the wheel lands on ${result} when the server says so`, async ({ page }) => {
      const calls = await openTable(page)
      calls.spinResults.push(result)
      await spin(page, 'Negre', '5')

      await expect(wheel(page)).toHaveAttribute('data-wheel', 'landed', { timeout: 10000 })
      await expect(wheel(page)).toHaveAttribute('data-landed', result)
      await expect(page.locator(`[data-result="${result}"]`)).toBeVisible()
    })
  }

  test('REQ-112: it starts on the tap, and keeps spinning until the server answers', async ({ page }) => {
    await openTable(page)
    const release = await holdSpin(page)
    await spin(page, 'Vermell', '5')

    await expect(wheel(page)).toHaveAttribute('data-wheel', 'spinning')
    const first = await angle(page)
    await expect.poll(() => angle(page)).not.toBe(first)
    await expect(page.locator('[data-result]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Girant…' })).toBeDisabled()

    release()
    await expect(wheel(page)).toHaveAttribute('data-wheel', 'landed', { timeout: 10000 })
  })

  test('REQ-112: nothing gives the result away before the wheel stops', async ({ page }) => {
    await openTable(page)
    const answered = page.waitForResponse('**/rest/v1/rpc/spin')
    await spin(page, 'Vermell', '5')

    // The server has answered, and the wheel is still turning.
    await answered
    await expect(wheel(page)).toHaveAttribute('data-wheel', turning)
    await expect(page.locator('[data-result]')).toHaveCount(0)
    await expect(balance(page)).toHaveAttribute('data-value', '100')
    await expect(wheel(page)).not.toHaveAttribute('data-landed', /./)

    await expect(page.locator('[data-result="red"]')).toBeVisible({ timeout: 10000 })
    await expect(balance(page)).toHaveAttribute('data-value', '105')
  })

  test('REQ-112: a refused spin stops the wheel, and shows no result', async ({ page }) => {
    await openTable(page)
    await spin(page, 'Vermell', '6')

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(wheel(page)).toHaveAttribute('data-wheel', 'idle')
    await expect(page.locator('[data-result]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Gira' })).toBeEnabled()
  })

  test('REQ-113: a second spin works after the first', async ({ page }) => {
    const calls = await openTable(page)
    calls.spinResults.push('black', 'white')
    await spin(page, 'Vermell', '1')
    await expect(wheel(page)).toHaveAttribute('data-landed', 'black', { timeout: 10000 })

    await page.getByRole('button', { name: 'Gira' }).click()
    await expect(wheel(page)).toHaveAttribute('data-wheel', turning)
    await expect(wheel(page)).toHaveAttribute('data-landed', 'white', { timeout: 10000 })
  })

  test('REQ-112: leaving mid-spin keeps the screen working', async ({ page }) => {
    await openTable(page)
    await spin(page, 'Vermell', '5')
    await page.getByRole('link', { name: 'Auditoria' }).click()
    await page.locator('[data-screen="auditoria"]').waitFor()
    await page.getByRole('link', { name: 'Ruleta' }).click()

    await expect(balance(page)).toHaveAttribute('data-value', '105')
    await expect(wheel(page)).toHaveAttribute('data-wheel', 'idle')
  })
})

test.describe('with reduced motion', () => {
  test('REQ-114: the wheel stays still while it waits', async ({ page }) => {
    await openTable(page)
    const release = await holdSpin(page)
    const before = await angle(page)
    await spin(page, 'Vermell', '5')

    await page.getByRole('button', { name: 'Girant…' }).waitFor()
    await page.waitForTimeout(300)
    expect(await angle(page)).toBe(before)
    await expect(wheel(page)).toHaveAttribute('data-wheel', 'idle')
    release()
  })

  for (const result of ['red', 'black', 'white'] as const) {
    test(`REQ-112, REQ-114: ${result} shows at once, on the right pocket`, async ({ page }) => {
      const calls = await openTable(page)
      calls.spinResults.push(result)
      await spin(page, 'Vermell', '5')

      await expect(page.locator(`[data-result="${result}"]`)).toBeVisible({ timeout: 1000 })
      await expect(wheel(page)).toHaveAttribute('data-landed', result)
    })
  }
})

test.describe('the admin settings', () => {
  const settings = async (page: Page) => {
    const me = { ...admin, balance: 100 }
    const calls = await fakeSupabase(page, [me, player])
    await page.goto('')
    await logIn(page, me)
    await page.getByRole('link', { name: 'Administració' }).click()
    await page.getByRole('heading', { name: 'Ruleta' }).waitFor()
    return calls
  }

  const white = (page: Page) => page.getByLabel('Blanc: 1 de cada')
  const maximum = (page: Page) => page.getByLabel('Aposta màxima (% del saldo)')
  const open = (page: Page) => page.getByRole('checkbox', { name: 'Taula oberta' })
  const save = (page: Page) => page.getByRole('button', { name: 'Desa la ruleta' }).click()

  test('REQ-115, REQ-116, REQ-117: the form starts from the current settings', async ({ page }) => {
    await settings(page)

    await expect(white(page)).toHaveValue('37')
    await expect(maximum(page)).toHaveValue('5')
    await expect(open(page)).toBeChecked()
  })

  test('REQ-115, REQ-116: new values are saved, and players see the new maximum', async ({ page }) => {
    const calls = await settings(page)
    await white(page).fill('10')
    await maximum(page).fill('10')
    await save(page)

    await expect(page.getByRole('status').filter({ hasText: "S'han desat" })).toBeVisible()
    expect(calls.roulette).toEqual({ enabled: true, white_one_in: 10, max_bet_percent: 10 })

    await page.getByRole('link', { name: 'Ruleta' }).click()
    await expect(page.locator('[data-max-bet]')).toHaveText('Aposta màxima: 10 marcones')
  })

  test('REQ-117, REQ-118: closing the table, then opening it again', async ({ page }) => {
    const calls = await settings(page)
    await open(page).uncheck({ force: true })
    await save(page)
    await expect(page.getByRole('status').filter({ hasText: "S'han desat" })).toBeVisible()
    expect(calls.roulette.enabled).toBe(false)

    await page.getByRole('link', { name: 'Ruleta' }).click()
    await expect(page.locator('[data-screen="ruleta"]')).toContainText('La taula està tancada')

    await page.getByRole('link', { name: 'Administració' }).click()
    await expect(open(page)).not.toBeChecked()
    await open(page).check({ force: true })
    await save(page)
    await expect(page.getByRole('status').filter({ hasText: "S'han desat" })).toBeVisible()

    await page.getByRole('link', { name: 'Ruleta' }).click()
    await expect(page.getByRole('button', { name: 'Gira' })).toBeVisible()
  })

  for (const value of ['1', '1001', '2.5', '', 'molts']) {
    test(`REQ-119: a white chance of "${value}" shows Catalan and saves nothing`, async ({ page }) => {
      const calls = await settings(page)
      await white(page).fill(value)
      await save(page)

      await expect(page.getByRole('alert')).toHaveText('La probabilitat de blanc ha de ser 1 entre un nombre enter de 2 a 1.000.')
      expect(calls.roulette).toEqual({ enabled: true, white_one_in: 37, max_bet_percent: 5 })
    })
  }

  for (const value of ['0', '101', '2.5', '']) {
    test(`REQ-119: a maximum of "${value}" shows Catalan and saves nothing`, async ({ page }) => {
      const calls = await settings(page)
      await maximum(page).fill(value)
      await save(page)

      await expect(page.getByRole('alert')).toHaveText("L'aposta màxima ha de ser un percentatge enter de l'1 al 100.")
      expect(calls.roulette).toEqual({ enabled: true, white_one_in: 37, max_bet_percent: 5 })
    })
  }

  test('REQ-115: a player has no settings to change', async ({ page }) => {
    await openTable(page)
    await expect(page.getByRole('link', { name: 'Administració' })).toHaveCount(0)
    await page.goto('#/administracio')
    await expect(page.getByLabel('Blanc: 1 de cada')).toHaveCount(0)
  })
})

test('REQ-023, REQ-024: a long result and a big balance still fit at 360px', async ({ page }) => {
  await openTable(page, 1234567)
  await spin(page, 'Vermell', '61728')
  await page.locator('[data-result]').first().waitFor()

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
