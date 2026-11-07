import { expect, test } from '@playwright/test'

import { openAs, trackRequests } from './helpers'

test('denies by default and never crashes when the backend fails', async ({
  page
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/api/permissions', (route) =>
    route.fulfill({ status: 500, body: 'boom' })
  )

  await openAs(page, 'admin', '/users')

  await expect(page).toHaveURL(/\/forbidden/)
  await expect(page.getByTestId('forbidden')).toBeVisible()
  expect(errors).toEqual([])
})

test('times out slow backends without hanging the app', async ({ page }) => {
  await page.route('**/api/permissions', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 15_000))
    await route.abort()
  })
  await page.goto('/')
  await expect(page.locator('header')).toBeVisible()
})

test('dedupes menu and page requests: one request per page key', async ({
  page
}) => {
  const keys = trackRequests(page)
  await openAs(page, 'admin', '/users')
  await expect(page.getByTestId('new-user')).toBeVisible()
  await page.getByTestId('menu').getByRole('link', { name: 'home' }).click()
  await page.getByTestId('menu').getByRole('link', { name: 'users' }).click()
  await expect(page.getByTestId('new-user')).toBeVisible()
  const unique = new Set(keys)
  expect(keys.length).toBe(unique.size)
  expect([...unique].sort()).toEqual(['billing', 'home', 'settings', 'users'])
})

test('redirects when a background refresh revokes the current page (SWR)', async ({
  page
}) => {
  await page.clock.install()
  let usersCalls = 0
  await page.route('**/api/permissions', async (route) => {
    const { pageKey } = route.request().postDataJSON() as { pageKey: string }
    const revoked = pageKey === 'users' && ++usersCalls > 1
    await route.fulfill({
      json: {
        key: pageKey,
        can_access: !revoked,
        components: []
      }
    })
  })

  await openAs(page, 'admin', '/users')
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()

  await page.getByTestId('menu').getByRole('link', { name: 'home' }).click()
  await page.clock.fastForward(61_000)
  await page.getByTestId('menu').getByRole('link', { name: 'users' }).click()

  await expect(page).toHaveURL(/\/forbidden/)
})
