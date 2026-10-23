import { expect, test } from './fixtures'

test('hints are tracked and progress, achievements and history update', async ({ page }) => {
  await page.goto('/labs/idor')
  await page.getByTestId('tab-hints').click()
  await page.getByRole('button', { name: 'Reveal hint 1' }).click()
  await expect(page.getByTestId('hint-1')).toContainText('Alice')
  await page.reload()
  await page.getByTestId('tab-hints').click()
  await expect(page.getByTestId('hint-1')).toContainText('Alice') // survives reload

  await page.getByTestId('tab-try').click()
  await page.getByTestId('idor-id').fill('102')
  await page.getByTestId('idor-open').click()
  await expect(page.getByTestId('idor-leak')).toBeVisible() // the exploit request has completed
  await page.getByTestId('tab-verify').click()
  await page.getByTestId('verify-run').click()
  await expect(page.getByTestId('verify-summary')).toContainText('Lab completed!')

  await page.getByRole('link', { name: 'Progress' }).click()
  await expect(page.getByTestId('achievement-first-blood')).toHaveAttribute('data-unlocked', 'true')
  await expect(page.getByTestId('achievement-patched')).toHaveAttribute('data-unlocked', 'true')
  await expect(page.getByTestId('achievement-no-hints')).toHaveAttribute('data-unlocked', 'false')
  await expect(page.getByText('Exploit detected')).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByTestId('reset-progress').click()
  await expect(page.getByText('No activity yet')).toBeVisible()
})

test('playground sends raw requests and shows status and body', async ({ page }) => {
  await page.goto('/labs/idor')
  await page.getByTestId('tab-playground').click()
  await page.getByRole('button', { name: "Alice: Bob's booking 102" }).click()
  await page.getByTestId('pg-send').click()
  await expect(page.getByTestId('pg-status')).toHaveText('200')
  await expect(page.getByTestId('pg-body')).toContainText('"owner": "bob"')
  await page.getByTestId('mode-fixed').click()
  await page.getByTestId('pg-send').click()
  await expect(page.getByTestId('pg-status')).toHaveText('403')
})
