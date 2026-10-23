import { expect, test } from './fixtures'

const render = async (page: import('@playwright/test').Page, payload: string) => {
  await page.getByTestId('xss-input').fill(payload)
  await page.getByTestId('xss-render').click()
}

test.describe('reflected XSS runs in an isolated sandbox', () => {
  test('payload executes in vulnerable mode and is detected', async ({ page }) => {
    await page.goto('/labs/xss')
    await render(page, '<img src=x onerror=alert(1)>')
    await expect(page.getByTestId('xss-executed')).toContainText('alert(1)')
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'true')
  })

  test('script tag payload also executes in vulnerable mode', async ({ page }) => {
    await page.goto('/labs/xss')
    await render(page, '<script>alert(2)</script>')
    await expect(page.getByTestId('xss-executed')).toContainText('alert(2)')
  })

  test('same payload is neutralised in fixed mode', async ({ page }) => {
    await page.goto('/labs/xss')
    await page.getByTestId('mode-fixed').click()
    await render(page, '<img src=x onerror=alert(1)>')
    const frame = page.frameLocator('[data-testid=xss-frame]')
    await expect(frame.locator('h2')).toContainText('<img src=x onerror=alert(1)>') // shown as text
    await expect(frame.locator('img')).toHaveCount(0)
    await page.waitForTimeout(1000)
    await expect(page.getByTestId('xss-executed')).toHaveCount(0)
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'false')
    await expect(page.getByTestId('step-defend')).toHaveAttribute('data-done', 'true')
  })

  test('injected script cannot reach the dashboard (sandbox + separate origin)', async ({ page }) => {
    await page.goto('/labs/xss')
    // If isolation were broken this would read the parent's DOM; instead the access throws.
    await render(page, '<img src=x onerror="try{alert(\'leaked:\'+parent.document.title)}catch(e){alert(\'isolated\')}">')
    await expect(page.getByTestId('xss-executed')).toContainText('isolated')
    await expect(page.getByTestId('xss-executed')).not.toContainText('leaked')
  })

  test('preview frame is sandboxed without allow-same-origin', async ({ page }) => {
    await page.goto('/labs/xss')
    await render(page, 'hello')
    const sandbox = await page.getByTestId('xss-frame').getAttribute('sandbox')
    expect(sandbox).toBe('allow-scripts')
    expect(await page.getByTestId('xss-frame').getAttribute('src')).not.toContain(new URL(page.url()).origin + '/')
  })
})

test('playground shows HTML responses as inert text on the dashboard', async ({ page }) => {
  await page.goto('/labs/xss')
  await page.getByTestId('tab-playground').click()
  await page.getByRole('button', { name: 'img onerror payload' }).click()
  await page.getByTestId('pg-send').click()
  await expect(page.getByTestId('pg-body')).toContainText('<img src=x onerror=alert(1)>')
  await expect(page.locator('img[src="x"]')).toHaveCount(0)
})
