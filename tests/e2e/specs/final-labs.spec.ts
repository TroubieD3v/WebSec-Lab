import { expect, test } from './fixtures'

test.describe('CSRF', () => {
  test('a forged cross-site transfer moves money in vulnerable mode', async ({ page }) => {
    await page.goto('/labs/csrf')
    await expect(page.getByTestId('csrf-balance-alice')).toHaveText('1000')
    await page.getByTestId('csrf-attack').click()
    await expect(page.getByTestId('csrf-moved')).toBeVisible()
    await expect(page.getByTestId('csrf-balance-mallory')).toHaveText('500')
    await expect(page.getByTestId('csrf-balance-alice')).toHaveText('500')
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'true')
  })

  test('the bank blocks it in fixed mode, also without an Origin header, and legit transfers still work', async ({ page }) => {
    await page.goto('/labs/csrf')
    await page.getByTestId('mode-fixed').click()
    await page.getByTestId('csrf-attack').click()
    await expect(page.getByTestId('csrf-blocked')).toContainText('Cross-site')
    await page.getByTestId('csrf-strip').check()
    await page.getByTestId('csrf-attack').click()
    await expect(page.getByTestId('csrf-blocked')).toContainText('CSRF token')
    await expect(page.getByTestId('csrf-balance-mallory')).toHaveText('0')

    await page.getByTestId('csrf-transfer').click()
    await expect(page.getByTestId('csrf-balance-bob')).toHaveText('250')
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'false')
    await expect(page.getByTestId('step-defend')).toHaveAttribute('data-done', 'true')
  })

  test('balances can be reset to repeat the attack', async ({ page }) => {
    await page.goto('/labs/csrf')
    await page.getByTestId('csrf-attack').click()
    await expect(page.getByTestId('csrf-balance-mallory')).toHaveText('500')
    await page.getByTestId('csrf-reset').click()
    await expect(page.getByTestId('csrf-balance-mallory')).toHaveText('0')
  })
})

test.describe('JWT', () => {
  const login = async (page: import('@playwright/test').Page) => {
    await page.getByTestId('jwt-login').click()
    await expect(page.getByTestId('jwt-token')).not.toHaveValue('')
  }

  test('alg:none and the weak secret both forge an admin token in vulnerable mode', async ({ page }) => {
    await page.goto('/labs/jwt')
    await login(page)
    await page.getByTestId('jwt-me').click()
    await expect(page.getByTestId('jwt-body')).toContainText('"role": "user"')
    await page.getByTestId('jwt-admin').click()
    await expect(page.getByTestId('jwt-status')).toHaveText('403')

    await page.getByTestId('jwt-payload').fill('{"sub": "alice", "role": "admin"}')
    await page.getByTestId('jwt-sign').click()
    await page.getByTestId('jwt-admin').click()
    await expect(page.getByTestId('jwt-admin-open')).toBeVisible()
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'true')

    await page.getByTestId('jwt-none').click()
    await page.getByTestId('jwt-admin').click()
    await expect(page.getByTestId('jwt-status')).toHaveText('200')
  })

  test('forged tokens are rejected in fixed mode', async ({ page }) => {
    await page.goto('/labs/jwt')
    await page.getByTestId('mode-fixed').click()
    await login(page)
    await page.getByTestId('jwt-payload').fill('{"sub": "alice", "role": "admin", "exp": 4102444800}')
    for (const button of ['jwt-sign', 'jwt-none']) {
      await page.getByTestId(button).click()
      await page.getByTestId('jwt-admin').click()
      await expect(page.getByTestId('jwt-status')).toHaveText('401')
    }
    await expect(page.getByTestId('jwt-admin-open')).toHaveCount(0)
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'false')
    await expect(page.getByTestId('step-defend')).toHaveAttribute('data-done', 'true')
  })
})

test.describe('File Upload', () => {
  test('an uploaded HTML file is served as a page and its script runs in the sandbox', async ({ page }) => {
    await page.goto('/labs/file-upload')
    await page.getByTestId('upload-sample-html').click()
    await page.getByTestId('upload-send').click()
    await expect(page.getByTestId('upload-status')).toHaveText('201')
    await expect(page.getByTestId('xss-executed')).toContainText('uploaded script ran')
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'true')
  })

  test('fixed mode refuses active content and disguises, and accepts a real image', async ({ page }) => {
    await page.goto('/labs/file-upload')
    await page.getByTestId('mode-fixed').click()
    for (const sample of ['html', 'svg', 'polyglot']) {
      await page.getByTestId(`upload-sample-${sample}`).click()
      await page.getByTestId('upload-send').click()
      await expect(page.getByTestId('upload-status')).toHaveText('415')
    }
    await page.getByTestId('upload-sample-png').click()
    await page.getByTestId('upload-send').click()
    await expect(page.getByTestId('upload-status')).toHaveText('201')
    await expect(page.getByTestId('upload-saved-as')).toContainText('.png')
    await expect(page.getByTestId('upload-image')).toBeVisible()
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'false')
    await expect(page.getByTestId('step-defend')).toHaveAttribute('data-done', 'true')
  })
})

test.describe('Race Condition', () => {
  test('parallel requests redeem the single-use coupon several times in vulnerable mode', async ({ page }) => {
    await page.goto('/labs/race-condition')
    await page.getByTestId('race-burst').click()
    await expect(page.getByTestId('race-exploited')).toBeVisible()
    expect(Number(await page.getByTestId('race-redemptions').textContent())).toBeGreaterThan(1)
    expect(Number(await page.getByTestId('race-balance').textContent())).toBeGreaterThan(10)
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'true')
  })

  test('exactly one request wins in fixed mode', async ({ page }) => {
    await page.goto('/labs/race-condition')
    await page.getByTestId('mode-fixed').click()
    await page.getByTestId('race-burst').click()
    await expect(page.getByTestId('race-safe')).toBeVisible()
    await expect(page.getByTestId('race-balance')).toHaveText('10')
    await expect(page.getByTestId('race-redemptions')).toHaveText('1')
    await expect(page.getByTestId('step-exploit')).toHaveAttribute('data-done', 'false')
    await expect(page.getByTestId('step-defend')).toHaveAttribute('data-done', 'true')
  })

  test('a single sequential redemption works and the wallet can be reset', async ({ page }) => {
    await page.goto('/labs/race-condition')
    await page.getByTestId('race-once').click()
    await expect(page.getByTestId('race-balance')).toHaveText('10')
    await page.getByTestId('race-once').click()
    await expect(page.getByTestId('race-statuses')).toContainText('0 accepted, 1 refused')
    await page.getByTestId('race-reset').click()
    await expect(page.getByTestId('race-balance')).toHaveText('0')
  })
})

test('all twelve labs complete end-to-end through the verification tab', async ({ page, request }) => {
  const alice = { Authorization: 'Bearer alice-demo-token' }
  const exploits: Record<string, (mode: string) => Promise<unknown>> = {
    csrf: (mode) => request.post(`/api/labs/csrf/${mode}/browser/visit-attacker-page`, { data: { to: 'mallory', amount: 5 } }),
    jwt: async (mode) => {
      const none = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
      const token = `${none({ alg: 'none' })}.${none({ sub: 'x', role: 'admin' })}.`
      return request.get(`/api/labs/jwt/${mode}/admin`, { headers: { Authorization: `Bearer ${token}` } })
    },
    'file-upload': async (mode) => {
      const upload = await request.post(`/api/labs/file-upload/${mode}/upload`, {
        multipart: { file: { name: 'e.html', mimeType: 'text/html', buffer: Buffer.from('<b>x</b>') } },
      })
      if (!upload.ok()) return upload // fixed mode refuses the file: that is the blocked attack
      const { filename } = await upload.json()
      return request.get(`http://127.0.0.1:8081/file-upload/${mode}/uploads/${filename}`)
    },
    'race-condition': (mode) =>
      Promise.all(Array.from({ length: 8 }, () => request.post(`/api/labs/race-condition/${mode}/redeem`, { data: { code: 'WELCOME10' } }))),
    idor: (mode) => request.get(`/api/labs/idor/${mode}/bookings/102`, { headers: alice }),
  }
  // The same attack in both modes: it succeeds in vulnerable mode and is blocked in fixed mode.
  for (const [lab, attack] of Object.entries(exploits)) {
    await attack('vulnerable')
    await attack('fixed')
    await page.goto(`/labs/${lab}`)
    await page.getByTestId('tab-verify').click()
    await page.getByTestId('verify-run').click()
    await expect(page.getByTestId('verify-summary'), lab).toContainText('Lab completed!')
    await expect(page.locator('[data-testid=check-row][data-passed=false]'), lab).toHaveCount(0)
  }
})
