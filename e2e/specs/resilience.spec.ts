import { expect, test } from '@playwright/test'

import { openAs, trackPageErrors, trackRequests } from './helpers'

test('denies by default and never crashes when the backend fails', async ({
  page
}) => {
  const errors = trackPageErrors(page)
  await page.route('**/api/permissions', (route) =>
    route.fulfill({ status: 500, body: 'boom' })
  )

  await openAs(page, 'admin', '/users')

  await expect(page).toHaveURL(/\/forbidden/)
  await expect(page.getByTestId('forbidden')).toBeVisible()
  await expect(page.getByTestId('new-user')).toHaveCount(0)
  await expect(page.getByTestId('menu').getByRole('link')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('denies by default when the network request is aborted', async ({
  page
}) => {
  const errors = trackPageErrors(page)
  await page.route('**/api/permissions', (route) => route.abort())

  await openAs(page, 'admin', '/users')

  await expect(page).toHaveURL(/\/forbidden/)
  await expect(page.getByTestId('new-user')).toHaveCount(0)
  expect(errors).toEqual([])
})

for (const [name, body] of [
  ['null', 'null'],
  ['a string', '"garbage"'],
  ['invalid JSON', '{not json']
] as const) {
  test(`denies by default when the backend answers ${name}`, async ({
    page
  }) => {
    const errors = trackPageErrors(page)
    await page.route('**/api/permissions', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body
      })
    )

    await openAs(page, 'admin', '/users')

    await expect(page).toHaveURL(/\/forbidden/)
    await expect(page.getByTestId('new-user')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('denies unknown or malformed entries instead of granting them', async ({
  page
}) => {
  await page.route('**/api/permissions', (route) =>
    route.fulfill({
      json: {
        key: 'users',
        can_access: true,
        components: [
          { key: 'filter', can_access: 'true', inputs: [] },
          null,
          { key: 'new-user', can_access: true, inputs: [{ key: 'save' }] }
        ]
      }
    })
  )

  await openAs(page, 'admin', '/users')

  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  await expect(page.getByTestId('filter')).toHaveCount(0)
  await expect(page.getByTestId('new-user').getByTestId('save')).toHaveCount(0)
})

test('times out a hanging backend and denies instead of hanging the app', async ({
  page
}) => {
  const errors = trackPageErrors(page)
  await page.clock.install()
  await page.route('**/api/permissions', () => {
    // Never answered: only the package timeout can end this request.
  })

  await openAs(page, 'admin', '/users')
  await expect(page.locator('header')).toBeVisible()
  await expect(page).not.toHaveURL(/\/forbidden/)

  await page.clock.fastForward(10_500)

  await expect(page).toHaveURL(/\/forbidden/)
  await expect(page.getByTestId('new-user')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('does not ask the backend for public routes', async ({ page }) => {
  const keys = trackRequests(page)
  await page.route('**/api/permissions', (route) =>
    route.fulfill({ status: 500, body: 'boom' })
  )
  await openAs(page, 'admin', '/forbidden')
  await expect(page.getByTestId('forbidden')).toBeVisible()
  expect(keys).not.toContain('forbidden')
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
