import { test, expect } from '../fixtures/test'
import { HttpStatus } from '../utils/helpers'

import type { Page } from '@playwright/test'

const EMPTY_MESSAGE = 'No items yet. Add one above.'

async function openItemsPage (page: Page) {
  await page.goto('/items')

  await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible()
}

test('when a blank name is submitted', async ({ page, request }) => {
  await openItemsPage(page)

  await page.getByPlaceholder('Name').fill('   ')
  await page.getByRole('button', { name: 'Add' }).click()

  const response = await request.get('/api/items')

  expect(response.status()).toBe(HttpStatus.Ok)
  expect(await response.json()).toStrictEqual([])
  await expect(page.getByText(EMPTY_MESSAGE)).toBeVisible()
})

test('when no items exist', async ({ page }) => {
  await openItemsPage(page)

  await expect(page.getByText(EMPTY_MESSAGE)).toBeVisible()
})

test('when an item is added', async ({ page, request }) => {
  await openItemsPage(page)

  await page.getByPlaceholder('Name').fill('Widget')
  await page.getByPlaceholder('Description').fill('A small widget')
  await page.getByRole('button', { name: 'Add' }).click()

  const row = page.getByRole('listitem').filter({ hasText: 'Widget' })

  await expect(row).toBeVisible()
  await expect(row).toContainText('A small widget')

  const response = await request.get('/api/items')
  const items = await response.json()

  expect(response.status()).toBe(HttpStatus.Ok)

  expect(items).toStrictEqual([
    {
      id: items[0].id,
      name: 'Widget',
      description: 'A small widget',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    },
  ])
})

test('when an item is deleted', async ({ page, request }) => {
  await request.post('/api/items', {
    data: {
      name: 'Widget',
      description: 'A small widget',
    },
  })

  await openItemsPage(page)

  const row = page.getByRole('listitem').filter({ hasText: 'Widget' })

  await expect(row).toBeVisible()

  await row.getByRole('button', { name: 'Delete' }).click()

  await expect(row).toBeHidden()
  await expect(page.getByText(EMPTY_MESSAGE)).toBeVisible()

  const response = await request.get('/api/items')

  expect(response.status()).toBe(HttpStatus.Ok)
  expect(await response.json()).toStrictEqual([])
})
