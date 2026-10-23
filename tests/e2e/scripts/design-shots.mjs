// Design review screenshots (not committed):  node scripts/design-shots.mjs [baseUrl]
import { chromium } from '@playwright/test'

const base = process.argv[2] ?? 'http://127.0.0.1:3100'
const out = new URL('../test-results/design/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

const browser = await chromium.launch()
for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
]) {
  const context = await browser.newContext({ viewport, locale: 'ru-RU', deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.addInitScript(() => localStorage.setItem('websec-lang', 'ru'))
  await page.goto(base)
  await page.waitForTimeout(1600)
  await page.screenshot({ path: `${out}${name}-dashboard.png`, fullPage: true })

  await page.goto(`${base}/labs/idor`)
  await page.getByTestId('idor-id').fill('102')
  await page.getByTestId('idor-open').click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${out}${name}-lab-vulnerable.png`, fullPage: true })

  await page.getByTestId('mode-fixed').click()
  await page.waitForTimeout(350) // mid-transition: the seal sweep and the aura crossfade
  await page.screenshot({ path: `${out}${name}-lab-switching.png` })
  await page.waitForTimeout(900)
  await page.getByTestId('idor-open').click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${out}${name}-lab-fixed.png`, fullPage: true })

  await page.getByTestId('tab-verify').click()
  await page.getByTestId('verify-run').click()
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${out}${name}-lab-verify.png`, fullPage: true })
  await context.close()
}
await browser.close()
console.log('saved to', out)
