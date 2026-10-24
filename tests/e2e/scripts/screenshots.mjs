// Regenerates docs/screenshots/*.png from a running stack:  node scripts/screenshots.mjs
// Resets progress before and after, so run it against a stack whose progress you do not need.
import { chromium } from '@playwright/test'

const base = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000'
const out = new URL('../../../docs/screenshots/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

const browser = await chromium.launch()
const open = async (theme) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' })
  await context.addInitScript((th) => {
    localStorage.setItem('websec-lang', 'en')
    localStorage.setItem('websec-theme', th)
  }, theme)
  return context.newPage()
}

const dark = await open('dark')
await dark.request.post(`${base}/api/progress/reset`)

// The dashboard in both themes (dark is the default).
for (const [theme, file] of [['dark', 'dashboard.png'], ['light', 'dashboard-light.png']]) {
  const page = theme === 'dark' ? dark : await open(theme)
  await page.goto(base)
  await page.getByTestId('open-sql-injection').waitFor()
  await page.waitForTimeout(1500) // let the dial draw in
  await page.screenshot({ path: `${out}${file}` })
}

// A lab right after the exploit was detected (dark), and its code diff (light).
await dark.goto(`${base}/labs/sql-injection`)
await dark.getByTestId('sqli-input').fill("' OR 1=1 --")
await dark.getByTestId('sqli-submit').click()
await dark.getByTestId('sqli-results').waitFor()
await dark.getByTestId('step-exploit').and(dark.locator('[data-done=true]')).waitFor()
await dark.waitForTimeout(900)
await dark.evaluate(() => window.scrollTo(0, 330))
await dark.screenshot({ path: `${out}lab-sql-injection.png` })

const light = await open('light')
await light.goto(`${base}/labs/sql-injection`)
await light.getByTestId('tab-code').click()
await light.getByTestId('code-diff').waitFor()
await light.evaluate(() => {
  const tabs = document.querySelector('[data-testid=tab-code]')
  window.scrollTo(0, (tabs?.getBoundingClientRect().top ?? 0) + window.scrollY - 96)
})
await light.waitForTimeout(600) // let the tab fade in
await light.screenshot({ path: `${out}code-diff.png` })

await dark.request.post(`${base}/api/progress/reset`)
await browser.close()
