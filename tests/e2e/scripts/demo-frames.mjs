// Captures the frames of the README demo:  node scripts/demo-frames.mjs [baseUrl]
// Then:  python scripts/make_gif.py  (stitches them into docs/screenshots/demo.gif)
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const base = process.argv[2] ?? 'http://127.0.0.1:3100'
const dir = new URL('../test-results/demo-frames/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
rmSync(dir, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 760 }, locale: 'en-US' })
await page.request.post(`${base}/api/progress/reset`)
await page.addInitScript(() => {
  localStorage.setItem('websec-lang', 'en')
  localStorage.setItem('websec-theme', 'dark')
})

const frames = []
let last = Date.now()
const shot = async (hold = 0) => {
  const file = `${dir}${String(frames.length).padStart(3, '0')}.png`
  await page.screenshot({ path: file })
  const now = Date.now()
  if (frames.length) frames[frames.length - 1].ms = now - last
  frames.push({ file, ms: 100 })
  last = now
  if (hold) frames[frames.length - 1].hold = hold
}
const record = async (ms) => {
  const until = Date.now() + ms
  while (Date.now() < until) await shot()
}

await page.goto(`${base}/labs/idor`)
await page.getByTestId('idor-id').waitFor()
await page.evaluate(() => window.scrollTo(0, 340))
await shot(1400)

// 1. Attack the vulnerable mode: Alice reads Bob's booking.
await page.getByTestId('idor-id').fill('102')
await shot(500)
await page.getByTestId('idor-open').click()
await record(1200)
await shot(1300)

// 2. Switch to the fixed mode: the screen cools down and the seal line sweeps.
await page.getByTestId('mode-fixed').click()
await record(1300)
await shot(600)

// 3. The same attack is refused.
await page.getByTestId('idor-open').click()
await record(1200)
await shot(2600)

writeFileSync(`${dir}frames.json`, JSON.stringify(frames))
await page.request.post(`${base}/api/progress/reset`)
await browser.close()
console.log(`${frames.length} frames in ${dir}`)
