import { expect, test } from './fixtures'

test('dashboard lists playable labs and the roadmap', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('watch the fix hold')
  for (const id of ['sql-injection', 'xss', 'stored-xss', 'idor', 'broken-access-control', 'csrf', 'broken-auth', 'jwt', 'path-traversal', 'file-upload', 'security-misconfiguration', 'race-condition']) {
    await expect(page.getByTestId(`open-${id}`)).toBeVisible()
  }
  await expect(page.getByTestId('stat-labs')).toHaveText('12')
  await expect(page.getByText('Coming soon')).toHaveCount(0)
  await expect(page.getByTestId('stat-completed')).toHaveText('0')
})

test('interface can be switched to Russian and the choice persists', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'ru', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('держит исправление')
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('держит исправление')
  await page.getByTestId('open-idor').click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('бронирования')
})

test('unknown lab shows an error instead of crashing', async ({ page }) => {
  await page.goto('/labs/does-not-exist')
  await expect(page.getByRole('alert')).toBeVisible()
})
