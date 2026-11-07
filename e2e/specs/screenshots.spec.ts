import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import { openAs, type Role } from './helpers'

const OUT = fileURLToPath(new URL('../../docs/images/', import.meta.url))

test.use({ viewport: { width: 900, height: 640 } })

for (const role of ['admin', 'editor', 'viewer'] as Role[]) {
  test(`users page as ${role} @screenshots`, async ({ page }) => {
    await openAs(page, role, '/users')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
    await page.screenshot({ path: `${OUT}users-${role}.png` })
  })
}

test('forbidden redirect @screenshots', async ({ page }) => {
  await openAs(page, 'editor', '/billing')
  await expect(page.getByTestId('forbidden')).toBeVisible()
  await page.screenshot({ path: `${OUT}forbidden.png` })
})
