import { expect, test } from './fixtures'

test.describe('IDOR', () => {
  test('Alice reads Bob\'s booking in vulnerable mode but not in fixed mode', async ({ page }) => {
    await page.goto('/labs/idor')
    await page.getByTestId('idor-id').fill('102')
    await page.getByTestId('idor-open').click()
    await expect(page.getByTestId('idor-status')).toHaveText('200')
    await expect(page.getByTestId('idor-leak')).toContainText('bob')
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'true')

    await page.getByTestId('mode-fixed').click()
    await page.getByTestId('idor-open').click()
    await expect(page.getByTestId('idor-status')).toHaveText('403')
    await expect(page.getByTestId('idor-leak')).toHaveCount(0)
  })

  test('reading your own booking is allowed in both modes', async ({ page }) => {
    await page.goto('/labs/idor')
    for (const mode of ['vulnerable', 'fixed']) {
      await page.getByTestId(`mode-${mode}`).click()
      await page.getByTestId('idor-open').click()
      await expect(page.getByTestId('idor-status')).toHaveText('200')
      await expect(page.getByTestId('idor-leak')).toHaveCount(0)
    }
  })
})

test.describe('Broken authentication', () => {
  test('wordlist cracks the password in vulnerable mode', async ({ page }) => {
    await page.goto('/labs/broken-auth')
    await page.getByTestId('auth-wordlist').click()
    await expect(page.getByTestId('auth-note')).toContainText('Password found: sunshine')
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'true')
  })

  test('wordlist is stopped by lockout in fixed mode', async ({ page }) => {
    await page.goto('/labs/broken-auth')
    await page.getByTestId('mode-fixed').click()
    await page.getByTestId('auth-wordlist').click()
    await expect(page.getByTestId('auth-note')).toContainText('HTTP 429')
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'false')
  })

  test('session survives logout in vulnerable mode only', async ({ page }) => {
    for (const [mode, expected] of [
      ['vulnerable', 'still works'],
      ['fixed', null],
    ] as const) {
      await page.goto('/labs/broken-auth')
      await page.getByTestId(`mode-${mode}`).click()
      await page.getByTestId('auth-pass').fill('sunshine')
      await page.getByTestId('auth-login').click()
      await expect(page.getByTestId('auth-token')).not.toHaveText('none')
      await page.getByTestId('auth-logout').click()
      await page.getByTestId('auth-old').click()
      if (expected) {
        await expect(page.getByTestId('auth-note')).toContainText(expected)
      } else {
        await expect(page.getByTestId('auth-log')).toContainText('Not authenticated')
        await expect(page.getByTestId('auth-note')).toHaveCount(0)
      }
    }
  })
})
