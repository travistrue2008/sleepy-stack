import { test as base } from '@playwright/test'
import { truncateTables } from '../utils/db'

type Fixtures = {
  _cleanup: void
}

export const test = base.extend<Fixtures>({
  _cleanup: [
    async ({ browser }, use) => {
      await truncateTables()
      await use()

      for (const context of browser.contexts()) {
        await context.close()
      }
    }, { auto: true },
  ],
})

export { expect } from '@playwright/test'
