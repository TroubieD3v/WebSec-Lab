import { expect, test as base } from '@playwright/test'

/** Every test starts from a clean slate: no progress, no lab state. */
export const test = base.extend({
  page: async ({ page, request }, use) => {
    const response = await request.post('/api/progress/reset')
    expect(response.ok()).toBeTruthy()
    await use(page)
  },
})

export { expect }
