import { expect, test } from '@playwright/test'

import { openAs } from './helpers'

test.describe('admin', () => {
  test('sees every link and can edit everything', async ({ page }) => {
    await openAs(page, 'admin', '/users')
    const menu = page.getByTestId('menu')
    for (const name of ['home', 'users', 'billing', 'settings']) {
      await expect(menu.getByRole('link', { name })).toBeVisible()
    }
    const form = page.getByTestId('new-user')
    await expect(form.getByPlaceholder('Username')).toBeEnabled()
    await expect(form.getByPlaceholder('Email')).toBeEnabled()
    await expect(form.getByPlaceholder('Password')).toBeVisible()
    await page.getByTestId('save').click()
    await expect(page.getByTestId('saved')).toBeVisible()
  })
})

test.describe('editor', () => {
  test('hides forbidden links and restricts fields', async ({ page }) => {
    await openAs(page, 'editor', '/users')
    await expect(
      page.getByTestId('menu').getByRole('link', { name: 'users' })
    ).toBeVisible()
    await expect(
      page.getByTestId('menu').getByRole('link', { name: 'billing' })
    ).toHaveCount(0)

    const form = page.getByTestId('new-user')
    await expect(form.getByPlaceholder('Username')).toBeEnabled()
    await expect(form.getByPlaceholder('Email')).toBeDisabled()
    await expect(form.getByPlaceholder('Email')).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    await expect(form.getByPlaceholder('Password')).toBeHidden()
  })

  test('is redirected away from a denied page with the origin in the URL', async ({
    page
  }) => {
    await openAs(page, 'editor', '/billing')
    await expect(page).toHaveURL(/\/forbidden\?from=(%2F|\/)billing/)
    await expect(page.getByTestId('forbidden')).toContainText('/billing')
    await expect(page.getByTestId('billing-content')).toHaveCount(0)
  })
})

test.describe('viewer', () => {
  test('gets the custom denied UI for a restricted section', async ({
    page
  }) => {
    await openAs(page, 'viewer', '/users')
    await expect(page.getByTestId('new-user')).toHaveCount(0)
    await expect(page.getByTestId('new-user-denied')).toContainText(
      'do not have permission'
    )
    await expect(page.getByTestId('filter').locator('select')).toBeDisabled()
  })

  test('guard() blocks code-only actions', async ({ page }) => {
    await openAs(page, 'viewer', '/users')
    let dialog = false
    page.on('dialog', async (d) => {
      dialog = true
      await d.dismiss()
    })
    await page.getByTestId('export').click()
    await expect(page.getByTestId('export')).toContainText('blocked')
    expect(dialog).toBe(false)
  })

  test('cannot open settings', async ({ page }) => {
    await openAs(page, 'viewer', '/settings')
    await expect(page).toHaveURL(/\/forbidden/)
  })
})

test('switching role updates menu and pages', async ({ page }) => {
  await openAs(page, 'admin', '/')
  await expect(
    page.getByTestId('menu').getByRole('link', { name: 'billing' })
  ).toBeVisible()
  await page.getByTestId('role').selectOption('viewer')
  await expect(
    page.getByTestId('menu').getByRole('link', { name: 'billing' })
  ).toHaveCount(0)
  await expect(
    page.getByTestId('menu').getByRole('link', { name: 'users' })
  ).toBeVisible()
})
