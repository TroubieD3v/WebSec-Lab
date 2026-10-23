// Regenerates docs/screenshots/*.png from a running stack:  node scripts/screenshots.mjs
import { chromium } from '@playwright/test'

const base = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000'
const out = new URL('../../../docs/screenshots/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' })).newPage()
await page.request.post(`${base}/api/progress/reset`)

await page.goto(base)
await page.getByTestId('open-sql-injection').waitFor()
await page.screenshot({ path: `${out}dashboard.png` })

await page.goto(`${base}/labs/sql-injection`)
await page.getByTestId('sqli-input').fill("' OR 1=1 --")
await page.getByTestId('sqli-submit').click()
await page.getByTestId('sqli-results').waitFor()
await page.getByTestId('step-exploit').and(page.locator('[data-done=true]')).waitFor()
await page.screenshot({ path: `${out}lab-sql-injection.png` })

await page.getByTestId('tab-code').click()
await page.getByTestId('code-diff').waitFor()
await page.screenshot({ path: `${out}code-diff.png` })

await page.request.post(`${base}/api/progress/reset`)
await browser.close()
