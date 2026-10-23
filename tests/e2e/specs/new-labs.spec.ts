import { expect, test } from './fixtures'

test.describe('Stored XSS', () => {
  test('stored payload fires on every load in vulnerable mode and is inert in fixed mode', async ({ page }) => {
    await page.goto('/labs/stored-xss')
    await page.getByTestId('sxss-text').fill('<img src=x onerror=alert(1)>')
    await page.getByTestId('sxss-post').click()
    await expect(page.getByTestId('xss-executed')).toContainText('alert(1)')
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'true')

    // The payload is stored: reloading the page fires it again without posting anything.
    await page.reload()
    await expect(page.getByTestId('xss-executed')).toContainText('alert(1)')

    await page.getByTestId('mode-fixed').click()
    await page.getByTestId('sxss-text').fill('<img src=x onerror=alert(1)>')
    await page.getByTestId('sxss-post').click()
    const frame = page.frameLocator('[data-testid=xss-frame]')
    await expect(frame.locator('li')).toContainText('<img src=x onerror=alert(1)>')
    await expect(frame.locator('img')).toHaveCount(0)
    await page.waitForTimeout(800)
    await expect(page.getByTestId('xss-executed')).toHaveCount(0)
  })

  test('author field is injectable too (40 characters is enough)', async ({ page }) => {
    await page.goto('/labs/stored-xss')
    await page.getByTestId('sxss-author').fill('<img src=x onerror=alert(7)>')
    await page.getByTestId('sxss-post').click()
    await expect(page.getByTestId('xss-executed')).toContainText('alert(7)')
  })

  test('stored script cannot reach the dashboard (sandbox + separate origin)', async ({ page }) => {
    await page.goto('/labs/stored-xss')
    await page.getByTestId('sxss-text').fill('<img src=x onerror="try{alert(parent.document.title)}catch(e){alert(\'isolated\')}">')
    await page.getByTestId('sxss-post').click()
    await expect(page.getByTestId('xss-executed')).toContainText('isolated')
  })

  test('comments can be cleared', async ({ page }) => {
    await page.goto('/labs/stored-xss')
    await page.getByTestId('sxss-text').fill('remember me')
    await page.getByTestId('sxss-post').click()
    const frame = page.frameLocator('[data-testid=xss-frame]')
    await expect(frame.locator('li')).toContainText('remember me')
    await page.getByTestId('sxss-clear').click()
    await expect(frame.locator('li')).toHaveCount(0)
  })
})

test.describe('Broken Access Control', () => {
  test('regular user reaches the admin API and escalates privileges in vulnerable mode', async ({ page }) => {
    await page.goto('/labs/broken-access-control')
    await page.getByTestId('bac-admin').click()
    await expect(page.getByTestId('bac-leak')).toBeVisible()
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'true')

    await page.getByTestId('bac-body').fill('{"role": "admin"}')
    await page.getByTestId('bac-profile').click()
    await expect(page.getByTestId('bac-escalated')).toBeVisible()
  })

  test('both attacks are refused in fixed mode', async ({ page }) => {
    await page.goto('/labs/broken-access-control')
    await page.getByTestId('mode-fixed').click()
    await page.getByTestId('bac-admin').click()
    await expect(page.getByTestId('bac-status')).toHaveText('403')
    await page.getByTestId('bac-body').fill('{"display_name": "Ally", "role": "admin"}')
    await page.getByTestId('bac-profile').click()
    await expect(page.getByTestId('bac-status')).toHaveText('400')
    await expect(page.getByTestId('bac-escalated')).toHaveCount(0)
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'false')
  })

  test('a real admin can use the admin panel in both modes', async ({ page }) => {
    await page.goto('/labs/broken-access-control')
    await page.getByTestId('bac-persona-admin').click()
    for (const mode of ['vulnerable', 'fixed']) {
      await page.getByTestId(`mode-${mode}`).click()
      await page.getByTestId('bac-admin').click()
      await expect(page.getByTestId('bac-status')).toHaveText('200')
      await expect(page.getByTestId('bac-leak')).toHaveCount(0)
    }
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'false')
  })
})

test.describe('Security Misconfiguration', () => {
  test('vulnerable mode leaks traces, secrets and banners', async ({ page }) => {
    await page.goto('/labs/security-misconfiguration')
    await page.getByTestId('mis-order').fill('abc')
    await page.getByTestId('mis-fetch').click()
    await expect(page.getByTestId('mis-trace')).toBeVisible()
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'true')

    await page.getByTestId('mis-debug').click()
    await expect(page.getByTestId('mis-secrets')).toBeVisible()

    await page.getByTestId('mis-ping').click()
    await expect(page.getByTestId('mis-missing')).toContainText('content-security-policy')
    await expect(page.getByTestId('mis-banner')).toContainText('x-powered-by')
  })

  test('fixed mode returns a generic error, no debug route and hardened headers', async ({ page }) => {
    await page.goto('/labs/security-misconfiguration')
    await page.getByTestId('mode-fixed').click()
    await page.getByTestId('mis-order').fill('abc')
    await page.getByTestId('mis-fetch').click()
    await expect(page.getByTestId('mis-status')).toHaveText('500')
    await expect(page.getByTestId('mis-body')).toContainText('incident')
    await expect(page.getByTestId('mis-trace')).toHaveCount(0)

    await page.getByTestId('mis-debug').click()
    await expect(page.getByTestId('mis-status')).toHaveText('404')

    await page.getByTestId('mis-ping').click()
    await expect(page.getByTestId('mis-secure')).toBeVisible()
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'false')
  })
})

test.describe('Path Traversal', () => {
  test('documents open normally and traversal escapes in vulnerable mode', async ({ page }) => {
    await page.goto('/labs/path-traversal')
    await page.getByTestId('path-open').click()
    await expect(page.getByTestId('path-content')).toContainText('Welcome')
    await expect(page.getByTestId('path-escaped')).toHaveCount(0)

    await page.getByTestId('path-input').fill('../../config/app.env')
    await page.getByTestId('path-open').click()
    await expect(page.getByTestId('path-content')).toContainText('SECRET_KEY')
    await expect(page.getByTestId('path-resolved')).toContainText('/srv/app/config/app.env')
    await expect(page.getByTestId('path-escaped')).toBeVisible()
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'true')

    await page.getByTestId('path-input').fill('/etc/passwd')
    await page.getByTestId('path-open').click()
    await expect(page.getByTestId('path-content')).toContainText('root:x:0:0')
  })

  test('every escape attempt is refused in fixed mode', async ({ page }) => {
    await page.goto('/labs/path-traversal')
    await page.getByTestId('mode-fixed').click()
    for (const name of ['../../config/app.env', '/etc/passwd', 'guides/../../../config/app.env']) {
      await page.getByTestId('path-input').fill(name)
      await page.getByTestId('path-open').click()
      await expect(page.getByTestId('path-status')).toHaveText('403')
      await expect(page.getByTestId('path-content')).not.toContainText('SECRET_KEY')
    }
    await page.getByTestId('path-input').fill('guides/start.txt')
    await page.getByTestId('path-open').click()
    await expect(page.getByTestId('path-status')).toHaveText('200')
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'false')
  })
})

test('every new lab completes end-to-end through the verification tab', async ({ page, request }) => {
  const exploits: Record<string, () => Promise<unknown>> = {
    'path-traversal': () => request.get('/api/labs/path-traversal/vulnerable/files', { params: { name: '../../config/app.env' } }),
    'security-misconfiguration': () => request.get('/api/labs/security-misconfiguration/vulnerable/debug/config'),
    'broken-access-control': () =>
      request.get('/api/labs/broken-access-control/vulnerable/admin/users', { headers: { Authorization: 'Bearer alice-demo-token' } }),
    'stored-xss': () => request.get('/api/labs/stored-xss/vulnerable/beacon'),
  }
  for (const [lab, exploit] of Object.entries(exploits)) {
    await exploit()
    await page.goto(`/labs/${lab}`)
    await page.getByTestId('tab-verify').click()
    await page.getByTestId('verify-run').click()
    await expect(page.getByTestId('verify-summary'), lab).toContainText('Lab completed!')
    await expect(page.locator('[data-testid=check-row][data-passed=false]'), lab).toHaveCount(0)
  }
})
