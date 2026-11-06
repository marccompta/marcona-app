import { expect, test } from '@playwright/test'

// REQ-001
test('the site loads under its base path with no failed requests', async ({ page, baseURL }) => {
  const failed: string[] = []
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`)
  })
  page.on('requestfailed', (r) => failed.push(`failed ${r.url()}`))

  await page.goto('./')
  await expect(page.locator('#root > *').first()).toBeVisible()

  const assets = await page.locator('script[src], link[rel="stylesheet"]').evaluateAll((els) =>
    els.map((e) => (e as HTMLScriptElement).src || (e as HTMLLinkElement).href),
  )
  expect(assets.length).toBeGreaterThan(0)
  for (const asset of assets) expect(asset.startsWith(baseURL!)).toBe(true)
  expect(failed).toEqual([])
})

// REQ-002
test('a screen survives a reload and opens from a direct link', async ({ page }) => {
  await page.goto('./#/classificacio')
  await expect(page.locator('[data-screen]')).toHaveAttribute('data-screen', 'classificacio')
  await page.reload()
  await expect(page.locator('[data-screen]')).toHaveAttribute('data-screen', 'classificacio')
})
