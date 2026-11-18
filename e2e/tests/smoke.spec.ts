import { test, expect } from '../fixtures/test'
import { HttpStatus } from '../utils/helpers'

test('when the api health endpoint is requested', async ({ request }) => {
  const response = await request.get('/api/health')

  expect(response.status()).toBe(HttpStatus.NoContent)
})

test('when the home page is opened', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Example' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Items' })).toBeVisible()
})
