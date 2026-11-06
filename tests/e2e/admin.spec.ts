import { expect, test, type Page } from '@playwright/test'
import { admin, fakeSupabase, logIn, player } from './fake-supabase'

const open = async (page: Page, username: string) => {
  await page.getByRole('button', { name: new RegExp(`^${username}`) }).click()
}

const startOnAdmin = async (page: Page, users = [{ ...admin }, { ...player, balance: 10 }]) => {
  const calls = await fakeSupabase(page, users)
  await logIn(page, admin)
  await page.getByRole('link', { name: 'Administració' }).click()
  await page.locator('[data-screen="administracio"]').waitFor()
  return calls
}

const create = async (page: Page, username: string, password: string) => {
  await page.getByLabel("Nom d'usuari").fill(username)
  await page.getByLabel('Contrasenya').fill(password)
  await page.getByRole('button', { name: "Crea l'usuari" }).click()
}

const adjust = async (page: Page, action: 'Afegeix' | 'Treu', amount: string, concept: string) => {
  await page.getByLabel('Quantitat').fill(amount)
  await page.getByLabel('Concepte').fill(concept)
  await page.getByRole('button', { name: action, exact: true }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('')
})

test.describe('creating users', () => {
  test('REQ-035: a valid user appears with 0 marcones, and can log in', async ({ page }) => {
    const calls = await startOnAdmin(page)
    await create(page, 'jordi', 'contrasenya-nova')

    await expect(page.getByRole('status')).toHaveText("S'ha creat jordi.")
    await expect(page.getByRole('button', { name: /^jordi/ })).toContainText('0 marcones')
    expect(calls.functions).toEqual([{ action: 'create', username: 'jordi', password: 'contrasenya-nova' }])
  })

  test('REQ-036: a badly formed username gets a Catalan error, and creates nobody', async ({ page }) => {
    await startOnAdmin(page)
    for (const username of ['AB', 'anna!']) {
      await create(page, username, 'contrasenya-nova')
      await expect(page.getByRole('alert')).toContainText("El nom d'usuari ha de tenir de 3 a 20 caràcters")
    }
    await expect(page.locator('.admin-row')).toHaveCount(2)
  })

  test('REQ-037: a used username gets a Catalan error', async ({ page }) => {
    await startOnAdmin(page, [{ ...admin }, { ...player, removed: true }])
    await create(page, 'anna', 'contrasenya-nova')
    await expect(page.getByRole('alert')).toHaveText("Aquest nom d'usuari ja existeix o ja s'ha fet servir.")
  })

  test('REQ-038: a short password gets a Catalan error, and creates nobody', async ({ page }) => {
    await startOnAdmin(page)
    await create(page, 'jordi', '12345')
    await expect(page.getByRole('alert')).toHaveText('La contrasenya és massa curta.')
    await expect(page.getByRole('button', { name: /^jordi/ })).toHaveCount(0)
  })
})

test.describe('adjusting marcones', () => {
  test('REQ-039: adding raises the balance', async ({ page }) => {
    const calls = await startOnAdmin(page)
    await open(page, 'anna')
    await adjust(page, 'Afegeix', '5', 'Benvinguda')

    await expect(page.getByRole('status')).toHaveText("S'han afegit les marcones.")
    await expect(page.getByRole('button', { name: /^anna/ })).toContainText('15 marcones')
    expect(calls.ledger).toMatchObject([{ delta: 5, balance_after: 15, concept: 'Benvinguda' }])
  })

  test('REQ-040: removing lowers the balance', async ({ page }) => {
    await startOnAdmin(page)
    await open(page, 'anna')
    await adjust(page, 'Treu', '4', 'Correcció')
    await expect(page.getByRole('button', { name: /^anna/ })).toContainText('6 marcones')
  })

  test('REQ-041: no Concept gets a Catalan error', async ({ page }) => {
    await startOnAdmin(page)
    await open(page, 'anna')
    await adjust(page, 'Afegeix', '5', '')
    await expect(page.getByRole('alert')).toHaveText('Escriu un concepte.')
    await expect(page.getByRole('button', { name: /^anna/ })).toContainText('10 marcones')
  })

  test('REQ-042: a bad amount gets a Catalan error', async ({ page }) => {
    await startOnAdmin(page)
    await open(page, 'anna')
    for (const amount of ['0', '1.5', '1,5', '', 'molt']) {
      await adjust(page, 'Afegeix', amount, 'Prova')
      await expect(page.getByRole('alert'), amount).toHaveText("La quantitat ha de ser un nombre enter d'1 o més.")
    }
    await expect(page.getByRole('button', { name: /^anna/ })).toContainText('10 marcones')
  })

  test('REQ-043: a removal below 0 gets a Catalan error and changes nothing', async ({ page }) => {
    await startOnAdmin(page)
    await open(page, 'anna')
    await adjust(page, 'Treu', '11', 'Massa')
    await expect(page.getByRole('alert')).toHaveText('El saldo no té prou marcones.')
    await expect(page.getByRole('button', { name: /^anna/ })).toContainText('10 marcones')
  })

  test('REQ-062: a double tap applies once', async ({ page }) => {
    const calls = await startOnAdmin(page)
    await open(page, 'anna')
    await page.getByLabel('Quantitat').fill('5')
    await page.getByLabel('Concepte').fill('Doble toc')
    await page.getByRole('button', { name: 'Afegeix', exact: true }).dblclick()

    await expect(page.getByRole('button', { name: /^anna/ })).toContainText('15 marcones')
    expect(calls.ledger).toHaveLength(1)
    expect(calls.adjustments).toHaveLength(1)
  })

  test('REQ-062: a retry after a lost response sends the same request ID', async ({ page }) => {
    const calls = await startOnAdmin(page)
    await open(page, 'anna')

    // The server applies the action, but the phone never hears back.
    let lost = false
    await page.route('**/rest/v1/rpc/admin_adjust', async (route) => {
      if (lost) return route.fallback()
      lost = true
      await route.fetch()
      return route.abort()
    })
    await page.route('**/rest/v1/rpc/admin_adjust', async (route) => {
      calls.adjustments.push(route.request().postDataJSON().p_request_id)
      return route.fallback()
    })

    await adjust(page, 'Afegeix', '5', 'Xarxa dolenta')
    await expect(page.getByRole('alert')).toBeVisible()
    await page.getByRole('button', { name: 'Afegeix', exact: true }).click()

    await expect(page.getByRole('status')).toHaveText("S'han afegit les marcones.")
    expect(new Set(calls.adjustments).size).toBe(1)
  })

  test('REQ-062: a new attempt after a success gets a new request ID', async ({ page }) => {
    const calls = await startOnAdmin(page)
    await open(page, 'anna')
    await adjust(page, 'Afegeix', '5', 'Primer')
    await expect(page.getByRole('button', { name: /^anna/ })).toContainText('15 marcones')
    await adjust(page, 'Afegeix', '5', 'Segon')
    await expect(page.getByRole('button', { name: /^anna/ })).toContainText('20 marcones')
    expect(calls.ledger).toHaveLength(2)
  })
})

test.describe('resetting a password', () => {
  test('REQ-044: sets the new password', async ({ page }) => {
    const calls = await startOnAdmin(page)
    await open(page, 'anna')
    await page.getByLabel('Contrasenya nova').fill('una-de-nova')
    await page.getByRole('button', { name: 'Canvia la contrasenya' }).click()

    await expect(page.getByRole('status')).toHaveText("S'ha canviat la contrasenya i s'han tancat les sessions.")
    expect(calls.functions).toEqual([{ action: 'reset', userId: 'anna', password: 'una-de-nova' }])
  })

  test('REQ-038: a short password gets a Catalan error', async ({ page }) => {
    await startOnAdmin(page)
    await open(page, 'anna')
    await page.getByLabel('Contrasenya nova').fill('123')
    await page.getByRole('button', { name: 'Canvia la contrasenya' }).click()
    await expect(page.getByRole('alert')).toHaveText('La contrasenya és massa curta.')
  })
})

test.describe('removing a user', () => {
  test('REQ-047: nothing happens until the second confirmation', async ({ page }) => {
    const calls = await startOnAdmin(page)
    await open(page, 'anna')
    await page.getByRole('button', { name: "Elimina l'usuari" }).click()

    await expect(page.getByText('Segur que vols eliminar anna?')).toBeVisible()
    expect(calls.functions).toEqual([])

    await page.getByRole('button', { name: 'No, cancel·la' }).click()
    expect(calls.functions).toEqual([])
    await expect(page.getByRole('button', { name: /^anna/ })).toBeVisible()
  })

  test('REQ-048, REQ-050: the second confirmation removes them from the list', async ({ page }) => {
    const calls = await startOnAdmin(page)
    await open(page, 'anna')
    await page.getByRole('button', { name: "Elimina l'usuari" }).click()
    await page.getByRole('button', { name: 'Sí, elimina' }).click()

    await expect(page.getByRole('button', { name: /^anna/ })).toHaveCount(0)
    expect(calls.functions).toEqual([{ action: 'remove', userId: 'anna' }])
  })

  test('REQ-052: removing myself gets a Catalan error', async ({ page }) => {
    await startOnAdmin(page)
    await open(page, 'marc')
    await page.getByRole('button', { name: "Elimina l'usuari" }).click()
    await page.getByRole('button', { name: 'Sí, elimina' }).click()

    await expect(page.getByRole('alert')).toHaveText('No pots eliminar el teu propi compte.')
    await expect(page.getByRole('button', { name: /^marc/ })).toBeVisible()
  })
})

test('REQ-023, REQ-024: the admin screen fits, with an open user, and has big enough targets', async ({ page }) => {
  await startOnAdmin(page)
  await open(page, 'anna')
  await page.getByRole('button', { name: "Elimina l'usuari" }).click()

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

test.describe('as a player', () => {
  test('REQ-046: no screen offers a password control', async ({ page }) => {
    await fakeSupabase(page)
    await logIn(page, player)

    for (const screen of ['classificacio', 'classificacio/marc', 'esdeveniments', 'ruleta', 'auditoria', 'administracio']) {
      await page.goto(`#/${screen}`)
      await page.locator('[data-screen]').waitFor()
      await expect(page.locator('input'), screen).toHaveCount(0)
      await expect(page.locator('body'), screen).not.toContainText('Contrasenya')
    }
  })
})

test.describe('when a session has ended on the server', () => {
  test('REQ-045, REQ-049: a reload goes back to the login', async ({ page }) => {
    const calls = await fakeSupabase(page)
    await logIn(page, player)
    calls.ended.add('anna')

    await page.reload()
    await expect(page.locator('[data-screen="login"]')).toBeVisible()
  })

  test('REQ-045, REQ-049: so does coming back to the tab', async ({ page }) => {
    const calls = await fakeSupabase(page)
    await logIn(page, player)
    calls.ended.add('anna')

    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await expect(page.locator('[data-screen="login"]')).toBeVisible()
  })

  test('REQ-048: a removed user sees a Catalan error at the login', async ({ page }) => {
    await fakeSupabase(page, [admin, { ...player, removed: true }])
    await page.getByLabel("Nom d'usuari").fill(player.username)
    await page.getByLabel('Contrasenya').fill(player.password)
    await page.getByRole('button', { name: 'Entra' }).click()
    await expect(page.getByRole('alert')).toHaveText('Aquest compte ja no està actiu.')
  })

  test('REQ-007: a session that is still valid stays logged in', async ({ page }) => {
    await fakeSupabase(page)
    await logIn(page, player)
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await page.reload()
    await expect(page.locator('[data-screen="classificacio"]')).toBeVisible()
  })
})
