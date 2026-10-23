import { expect, test } from './fixtures'

const LABS = [
  'sql-injection', 'xss', 'stored-xss', 'idor', 'broken-access-control', 'csrf',
  'broken-auth', 'jwt', 'path-traversal', 'file-upload', 'security-misconfiguration', 'race-condition',
]

const overflow = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test.describe('phone-sized screens', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('no page scrolls sideways', async ({ page }) => {
    for (const path of ['/', '/progress']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      expect(await overflow(page), path).toBeLessThanOrEqual(0)
    }
    for (const lab of LABS) {
      await page.goto(`/labs/${lab}`)
      await page.getByTestId('tab-try').waitFor()
      expect(await overflow(page), `${lab}/try`).toBeLessThanOrEqual(0)
      await page.getByTestId('tab-playground').click()
      await page.getByTestId('pg-send').click()
      await page.getByTestId('pg-status').waitFor()
      expect(await overflow(page), `${lab}/playground`).toBeLessThanOrEqual(0)
      await page.getByTestId('tab-code').click()
      await page.getByTestId('code-diff').waitFor()
      expect(await overflow(page), `${lab}/code`).toBeLessThanOrEqual(0)
    }
  })
})

test('the screen takes the colour of the current mode', async ({ page }) => {
  await page.goto('/labs/idor')
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'vulnerable')
  await page.getByTestId('mode-fixed').click()
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'fixed')
  await page.getByRole('link', { name: /All labs|Все лаборатории/ }).click()
  await expect(page.locator('html')).not.toHaveAttribute('data-mode', /.+/) // neutral outside a lab
})

test('the page language is announced from the first render', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('websec-lang', 'ru'))
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
})

test('code diff lines stay inside their own column', async ({ page }) => {
  for (const lab of LABS) {
    await page.goto(`/labs/${lab}`)
    await page.getByTestId('tab-code').click()
    await page.getByTestId('code-diff').waitFor()
    const spilling = await page.locator('[data-testid=code-diff] td').evaluateAll((cells) =>
      cells.filter((td) => td.scrollWidth > td.clientWidth + 1).length,
    )
    expect(spilling, lab).toBe(0)
  }
})
