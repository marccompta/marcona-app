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

test.describe('the bet after a spin', () => {
  const betBox = (page: Page) => page.getByLabel('Aposta', { exact: true })
  const maxBet = (page: Page) => page.locator('[data-max-bet]')

  test('REQ-222: after a loss lowers the maximum below the bet, the bet drops to it', async ({ page }) => {
    const calls = await openTable(page)
    calls.spinResults.push('black')
    await spin(page, 'Vermell', '5')
    await expect(maxBet(page)).toHaveText('Aposta màxima: 4 marcones')
    // Read once: the box must already show it, with no typing.
    expect(await betBox(page).inputValue()).toBe('4')

    await page.getByRole('button', { name: 'Gira' }).click()
    await expect(balance(page)).toHaveAttribute('data-value', '99')
    expect(calls.eventCalls.map((call) => call.p_bet)).toEqual([5, 4])
  })

  test('REQ-222: a bet still within the new maximum stays as typed', async ({ page }) => {
    const calls = await openTable(page)
    calls.spinResults.push('black')
    await spin(page, 'Vermell', '2')
    await expect(maxBet(page)).toHaveText('Aposta màxima: 4 marcones')
    expect(await betBox(page).inputValue()).toBe('2')
  })

  test('REQ-222: a win leaves the bet as typed', async ({ page }) => {
    await openTable(page, 1000)
    await spin(page, 'Vermell', '50')
    await expect(maxBet(page)).toHaveText('Aposta màxima: 52 marcones')
    expect(await betBox(page).inputValue()).toBe('50')
  })

  test('REQ-222, REQ-102: a refused spin leaves the bet as typed', async ({ page }) => {
    await openTable(page)
    const refreshed = page.waitForResponse(
      (response) => response.url().includes('/rpc/roulette_state') && response.request().method() === 'POST',
    )
    await spin(page, 'Vermell', '6')
    await expect(page.getByRole('alert')).toBeVisible()
    await refreshed
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve))))
    expect(await betBox(page).inputValue()).toBe('6')
  })

  test('REQ-222, REQ-102: a spin tapped before the new maximum arrives, then refused, keeps its bet', async ({ page }) => {
    const calls = await openTable(page)
    // Hold the read that follows the first spin, as on a slow phone.
    let release = () => {}
    const held = new Promise<void>((resolve) => (release = resolve))
    let reads = 0
    await page.route('**/rest/v1/rpc/roulette_state', async (route) => {
      if (route.request().method() === 'POST' && ++reads === 1) await held
      return route.fallback()
    })
    calls.spinResults.push('black')
    await spin(page, 'Vermell', '5')
    await expect(page.locator('[data-result="black"]')).toBeVisible()
    // Tapped again at once, with the old bet: the server refuses it.
    await page.getByRole('button', { name: 'Gira' }).click()
    await expect(page.getByRole('alert')).toHaveText("L'aposta supera el màxim que pots apostar ara.")

    const late = page.waitForResponse(
      (response) => response.url().includes('/rpc/roulette_state') && response.request().method() === 'POST',
    )
    release()
    await late
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve))))
    expect(await betBox(page).inputValue()).toBe('5')
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

// How much of the confetti canvas has been painted on.
const painted = (page: Page) =>
  page.locator('[data-confetti]').evaluate((canvas) => {
    const { width, height } = canvas as HTMLCanvasElement
    const { data } = (canvas as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, width, height)
    let pixels = 0
    for (let index = 3; index < data.length; index += 4) if (data[index] > 0) pixels += 1
    return pixels
  })

const winAmount = (page: Page) => page.locator('[data-win-amount]')
const confetti = (page: Page) => page.locator('[data-confetti]')

// Timed in the browser, as a test runner on a busy machine can notice things late.
const timeOnScreen = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let began = 0
        new MutationObserver(() => {
          const amount = document.querySelector('[data-win-amount]')
          if (amount && !began) began = performance.now()
          if (!amount && began) resolve(performance.now() - began)
        }).observe(document.body, { childList: true, subtree: true })
      }),
  )

// Right now, with no retrying: a celebration ends by itself, so a check that
// retries would simply wait for a wrong one to go.
const nothingCelebrating = async (page: Page) => {
  expect(await winAmount(page).count()).toBe(0)
  expect(await confetti(page).count()).toBe(0)
}

test.describe('a win', () => {
  test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('REQ-113: the marcones won show large over the wheel, with confetti', async ({ page }) => {
      await openTable(page)
      await spin(page, 'Vermell', '5')

      await expect(winAmount(page)).toBeVisible({ timeout: 10000 })
      await expect(winAmount(page)).toContainText('+5')
      await expect(winAmount(page)).toContainText('marcones')
      await expect.poll(() => painted(page)).toBeGreaterThan(200)

      const size = await winAmount(page).locator('strong').evaluate((amount) => parseFloat(getComputedStyle(amount).fontSize))
      expect(size).toBeGreaterThanOrEqual(56)
    })

    test('REQ-113: it waits for the wheel, as it gives the result away', async ({ page }) => {
      await openTable(page)
      const answered = page.waitForResponse('**/rest/v1/rpc/spin')
      await spin(page, 'Vermell', '5')
      await answered

      await expect(wheel(page)).toHaveAttribute('data-wheel', turning)
      await nothingCelebrating(page)
    })

    test('REQ-113: the amount lasts about a second, and the confetti then clears', async ({ page }) => {
      await openTable(page)
      const shown = timeOnScreen(page)
      await spin(page, 'Vermell', '5')

      const time = await shown
      expect(time).toBeGreaterThanOrEqual(1000)
      expect(time).toBeLessThan(2000)
      await expect(confetti(page)).toHaveCount(0, { timeout: 3000 })

      // The result stays, as only the celebration is brief.
      await expect(page.locator('[data-result="red"]')).toContainText('Guanyes 5 marcones')
    })

    for (const [choice, result] of [
      ['Vermell', 'black'],
      ['Vermell', 'white'],
      ['Negre', 'red'],
    ] as const) {
      test(`REQ-113: ${result} on a bet on ${choice} celebrates nothing`, async ({ page }) => {
        const calls = await openTable(page)
        calls.spinResults.push(result)
        await spin(page, choice, '5')

        await expect(page.locator(`[data-result="${result}"]`)).toBeVisible({ timeout: 10000 })
        await page.waitForTimeout(100)
        await nothingCelebrating(page)
      })
    }

    test('REQ-113: a new spin clears the last celebration, and a second win gets its own', async ({ page }) => {
      const calls = await openTable(page)
      calls.spinResults.push('red', 'black', 'red')
      await spin(page, 'Vermell', '2')
      await winAmount(page).waitFor({ timeout: 10000 })

      await page.getByRole('button', { name: 'Gira' }).click()
      await expect(page.getByRole('button', { name: 'Girant…' })).toBeVisible()
      await nothingCelebrating(page)
      await expect(page.locator('[data-result="black"]')).toBeVisible({ timeout: 10000 })

      await page.getByRole('button', { name: 'Gira' }).click()
      await expect(winAmount(page)).toContainText('+2', { timeout: 10000 })
    })

    test('REQ-113: nothing covers the controls, so the next spin can be tapped at once', async ({ page }) => {
      await openTable(page)
      await spin(page, 'Vermell', '1')
      await winAmount(page).waitFor({ timeout: 10000 })

      await page.getByRole('button', { name: 'Negre' }).click({ timeout: 500 })
      await expect(page.getByRole('button', { name: 'Negre' })).toHaveAttribute('aria-pressed', 'true')
    })

    test('REQ-113: leaving mid-celebration clears it', async ({ page }) => {
      await openTable(page)
      await spin(page, 'Vermell', '1')
      await winAmount(page).waitFor({ timeout: 10000 })
      await page.getByRole('link', { name: 'Auditoria' }).click()
      await page.locator('[data-screen="auditoria"]').waitFor()

      await nothingCelebrating(page)
    })

    test('REQ-023: one marcona reads right, and a big win fits at 360px', async ({ page }) => {
      await openTable(page, 1234567890)
      await spin(page, 'Vermell', '61728394')
      await winAmount(page).waitFor({ timeout: 10000 })

      const box = await winAmount(page).locator('strong').boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(360)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })

    test('REQ-017: a win of one says marcona', async ({ page }) => {
      await openTable(page)
      await spin(page, 'Vermell', '1')
      await expect(winAmount(page)).toContainText('+1', { timeout: 10000 })
      await expect(winAmount(page).locator('span')).toHaveText('marcona')
    })
  })

  test.describe('with reduced motion', () => {
    test('REQ-114: the amount still shows, for about a second, with no confetti', async ({ page }) => {
      await openTable(page)
      const shown = timeOnScreen(page)
      await spin(page, 'Vermell', '5')

      await expect(winAmount(page)).toContainText('+5', { timeout: 1000 })
      expect(await confetti(page).count()).toBe(0)
      expect(await winAmount(page).evaluate((amount) => getComputedStyle(amount).animationName)).toBe('none')

      const time = await shown
      expect(time).toBeGreaterThanOrEqual(1000)
      expect(time).toBeLessThan(2000)
    })
  })
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

// REQ-219 to REQ-221: the board of the player's last results, under the bet.
test.describe('the board of last results', () => {
  const spinMovement = (username: string, result: 'red' | 'black' | 'white') => ({
    username,
    delta: result === 'red' ? 1 : -1,
    balance_after: 100,
    concept: null,
    kind: 'roulette_spin',
    details: { choice: 'red', result },
  })

  const openWith = async (page: Page, movements: Parameters<typeof fakeSupabase>[2]) => {
    const me = { ...player, balance: 100 }
    const calls = await fakeSupabase(page, [me, { ...admin }], movements)
    await page.goto('')
    await logIn(page, me)
    await page.getByRole('link', { name: 'Ruleta' }).click()
    await page.locator('[data-board][data-loaded]').waitFor()
    return calls
  }

  // Read once, with no retrying, as the board must already be right.
  const board = (page: Page) =>
    page.locator('[data-board] [data-place]').evaluateAll((places) => places.map((place) => (place as HTMLElement).dataset.place))

  test('REQ-221: before any spin, the board has 10 empty places', async ({ page }) => {
    await openWith(page, [])
    await expect(page.getByRole('list', { name: 'Últimes tirades' })).toBeVisible()
    expect(await page.getByText('Últimes tirades').count()).toBe(0)
    expect(await board(page)).toEqual(Array(10).fill('empty'))
  })

  test('REQ-219, REQ-221: it shows my results, newest first, then empty places', async ({ page }) => {
    await openWith(page, [spinMovement('anna', 'red'), spinMovement('anna', 'white'), spinMovement('anna', 'black')])
    expect(await board(page)).toEqual(['black', 'white', 'red', ...Array(7).fill('empty')])
  })

  test("REQ-219: only my 10 newest spins, and nobody else's, nor other movements", async ({ page }) => {
    const mine = Array.from({ length: 12 }, (_, index) => spinMovement('anna', index < 2 ? 'white' : index % 2 ? 'black' : 'red'))
    await openWith(page, [
      ...mine,
      spinMovement('marc', 'white'),
      { username: 'anna', delta: 5, balance_after: 105, concept: 'Saldo', kind: 'admin_adjustment' },
    ])
    expect(await board(page)).toEqual(['black', 'red', 'black', 'red', 'black', 'red', 'black', 'red', 'black', 'red'])
  })

  test('REQ-220: a spin joins the front, and the oldest of 10 goes', async ({ page }) => {
    const calls = await openWith(page, Array.from({ length: 10 }, () => spinMovement('anna', 'black')))
    calls.spinResults.push('white')
    await spin(page, 'Vermell', '5')
    await page.locator('[data-result="white"]').waitFor()

    expect(await board(page)).toEqual(['white', ...Array(9).fill('black')])
  })

  test('REQ-220: a refused spin adds nothing', async ({ page }) => {
    await openWith(page, [spinMovement('anna', 'red')])
    await spin(page, 'Vermell', '99')
    await expect(page.getByRole('alert')).toBeVisible()

    expect(await board(page)).toEqual(['red', ...Array(9).fill('empty')])
  })

  test('REQ-219: the whole board fits above the tabs on a 360 by 740 screen, with no scrolling', async ({ page }) => {
    const calls = await openWith(page, [spinMovement('anna', 'red')])
    calls.spinResults.push('black')
    await spin(page, 'Vermell', '5')
    await page.locator('[data-result="black"]').waitFor()
    await page.evaluate(() => document.querySelectorAll('*').forEach((element) => (element.scrollTop = 0)))

    const bottom = await page.locator('[data-board] [data-place]').last().evaluate((place) => place.getBoundingClientRect().bottom)
    const tabs = await page.locator('nav.tabs').evaluate((nav) => nav.getBoundingClientRect().top)
    expect(bottom).toBeLessThanOrEqual(tabs)
  })

  test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('REQ-220: the result joins the board only once the wheel has stopped', async ({ page }) => {
      const calls = await openWith(page, [])
      calls.spinResults.push('red')
      // Every change to the board, with the wheel's state at that moment.
      await page.evaluate(() => {
        const seen: { first: string | undefined; wheel: string | undefined }[] = []
        ;(window as unknown as { seen: typeof seen }).seen = seen
        new MutationObserver(() => {
          const first = document.querySelector<HTMLElement>('[data-board] [data-place]')?.dataset.place
          const wheel = document.querySelector<HTMLElement>('[data-wheel]')?.dataset.wheel
          seen.push({ first, wheel })
        }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['data-place', 'data-wheel'] })
      })
      await spin(page, 'Vermell', '5')
      await expect(page.locator('[data-result="red"]')).toBeVisible({ timeout: 10000 })

      const seen = await page.evaluate(() => (window as unknown as { seen: { first: string; wheel: string }[] }).seen)
      expect(seen.some((moment) => moment.wheel === 'spinning')).toBe(true)
      expect(seen.filter((moment) => moment.first === 'red').every((moment) => moment.wheel === 'landed')).toBe(true)
      expect(await board(page)).toEqual(['red', ...Array(9).fill('empty')])
    })
  })
})
