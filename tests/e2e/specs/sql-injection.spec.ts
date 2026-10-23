import { expect, test } from './fixtures'

const search = async (page: import('@playwright/test').Page, name: string) => {
  await page.getByTestId('sqli-input').fill(name)
  await page.getByTestId('sqli-submit').click()
}

test('exploit in vulnerable mode, blocked in fixed mode, lab completes after verification', async ({ page }) => {
  await page.goto('/labs/sql-injection')

  await search(page, 'Laptop Pro')
  await expect(page.getByTestId('sqli-results')).toContainText('Laptop Pro')
  await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'false')

  await search(page, "' OR 1=1 --")
  await expect(page.getByTestId('sqli-results')).toContainText('Prototype X-9000')
  await expect(page.getByTestId('sqli-query')).toContainText("' OR 1=1 --")
  await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'true')
  await expect(page.getByTestId('lab-status')).toContainText('Exploit found')

  await page.getByTestId('mode-fixed').click()
  await search(page, "' OR 1=1 --")
  await expect(page.getByText('No products found.')).toBeVisible()

  await page.getByTestId('tab-verify').click()
  await page.getByTestId('verify-run').click()
  await expect(page.getByTestId('verify-summary')).toContainText('Lab completed!')
  await expect(page.locator('[data-testid=check-row][data-passed=false]')).toHaveCount(0)
  await expect(page.getByTestId('step-complete')).toHaveAttribute('data-done', 'true')
})

test('SQL errors are leaked in vulnerable mode only', async ({ page }) => {
  await page.goto('/labs/sql-injection')
  await search(page, "'")
  await expect(page.getByTestId('sqli-error')).toBeVisible()
  await page.getByTestId('mode-fixed').click()
  await search(page, "'")
  await expect(page.getByTestId('sqli-error')).toHaveCount(0)
})

test('verification alone never completes a lab', async ({ page }) => {
  await page.goto('/labs/sql-injection')
  await page.getByTestId('tab-verify').click()
  await page.getByTestId('verify-run').click()
  await expect(page.getByTestId('verify-summary')).toContainText('exploit the Vulnerable mode yourself')
  await expect(page.getByTestId('lab-status')).toContainText('Not started')
})

test('code diff shows the real vulnerable and fixed code', async ({ page }) => {
  await page.goto('/labs/sql-injection')
  await page.getByTestId('tab-code').click()
  const diff = page.getByTestId('code-diff')
  await expect(diff).toContainText("WHERE name = '{name}'")
  await expect(diff).toContainText('WHERE name = ?')
  await page.getByRole('tab', { name: 'Fixed code' }).click()
  await expect(page.getByTestId('code-plain')).toContainText('(name,)')
})
