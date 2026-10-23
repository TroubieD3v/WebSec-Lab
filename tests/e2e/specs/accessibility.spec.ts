import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

const LABS = [
  'sql-injection', 'xss', 'stored-xss', 'idor', 'broken-access-control', 'csrf',
  'broken-auth', 'jwt', 'path-traversal', 'file-upload', 'security-misconfiguration', 'race-condition',
]

/** WCAG 2.1 A/AA audit of the current view. The sandboxed lab preview is another origin and is skipped. */
async function audit(page: Page, where: string) {
  await page.waitForTimeout(450) // let entrance animations settle so colours are measured at rest
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('[data-testid=xss-frame]')
    .analyze()
  const summary = violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`)
  expect(summary, where).toEqual([])
}

test('dashboard and progress pass WCAG 2.1 AA in both languages', async ({ page }) => {
  for (const lang of ['en', 'ru']) {
    await page.addInitScript((l) => localStorage.setItem('websec-lang', l), lang)
    await page.goto('/')
    await page.getByTestId('stat-labs').waitFor()
    await audit(page, `dashboard/${lang}`)
    await page.goto('/progress')
    await page.getByTestId('reset-progress').waitFor()
    await audit(page, `progress/${lang}`)
  }
})

test('every lab passes WCAG 2.1 AA on every tab, in both modes', async ({ page }) => {
  test.setTimeout(240_000)
  for (const lab of LABS) {
    await page.goto(`/labs/${lab}`)
    for (const mode of ['vulnerable', 'fixed']) {
      await page.getByTestId(`mode-${mode}`).click()
      await page.getByTestId('tab-try').click()
      await audit(page, `${lab}/${mode}/try`)
    }
    await page.getByTestId('tab-playground').click()
    await page.getByTestId('pg-send').click()
    await page.getByTestId('pg-status').waitFor()
    await audit(page, `${lab}/playground`)
    await page.getByTestId('tab-code').click()
    await page.getByTestId('code-diff').waitFor()
    await audit(page, `${lab}/code`)
    await page.getByTestId('tab-hints').click()
    await audit(page, `${lab}/hints`)
    await page.getByTestId('tab-verify').click()
    await page.getByTestId('verify-run').click()
    await page.getByTestId('verify-summary').waitFor()
    await audit(page, `${lab}/verify`)
    await page.getByTestId('tab-learn').click()
    await audit(page, `${lab}/learn`)
  }
})

test('the mode switch works from the keyboard', async ({ page }) => {
  await page.goto('/labs/idor')
  await page.locator('input[name=lab-mode][value=vulnerable]').focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'fixed')
  await expect(page.locator('input[name=lab-mode][value=fixed]')).toBeChecked()
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'vulnerable')
})
