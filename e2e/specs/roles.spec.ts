import { expect, test } from '@playwright/test'

import { openAs, trackPageErrors } from './helpers'

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

  test('can type in every editable field', async ({ page }) => {
    await openAs(page, 'admin', '/users')
    const form = page.getByTestId('new-user')
    await form.getByPlaceholder('Email').fill('a@b.co')
    await form.getByPlaceholder('Password').fill('secret')
    await expect(form.getByPlaceholder('Email')).toHaveValue('a@b.co')
    await expect(form.getByPlaceholder('Password')).toHaveValue('secret')
    await expect(form.getByPlaceholder('Email')).not.toHaveAttribute(
      'aria-disabled',
      'true'
    )
  })

  test('opens billing and settings without being redirected', async ({
    page
  }) => {
    const errors = trackPageErrors(page)
    await openAs(page, 'admin', '/billing')
    await expect(page.getByTestId('billing-content')).toBeVisible()
    await page
      .getByTestId('menu')
      .getByRole('link', { name: 'settings' })
      .click()
    await expect(page).toHaveURL(/\/settings$/)
    expect(errors).toEqual([])
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

  test('cannot type in a read-only field but can use the rest', async ({
    page
  }) => {
    await openAs(page, 'editor', '/users')
    const form = page.getByTestId('new-user')
    await expect(form.getByPlaceholder('Email')).toHaveClass(/warden-disabled/)
    await expect(form.getByPlaceholder('Email')).toHaveAttribute('inert', '')
    await expect(form.getByPlaceholder('Username')).not.toHaveClass(
      /warden-disabled/
    )
    await form.getByPlaceholder('Username').fill('ana')
    await page.getByTestId('save').click()
    await expect(page.getByTestId('saved')).toBeVisible()
  })

  test('keeps the hidden field out of the DOM flow', async ({ page }) => {
    await openAs(page, 'editor', '/users')
    const password = page.getByPlaceholder('Password')
    await expect(password).toHaveAttribute('aria-hidden', 'true')
    await expect(password).toHaveCSS('display', 'none')
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
    const dialogs: string[] = []
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message())
      void dialog.dismiss()
    })
    await expect(page.getByTestId('export')).toContainText('blocked')
    await page.getByTestId('export').click()
    await expect(page.getByTestId('saved')).toHaveCount(0)
    expect(dialogs).toEqual([])
  })

  test('keeps the allowed section usable', async ({ page }) => {
    await openAs(page, 'viewer', '/users')
    const filter = page.getByTestId('filter')
    await expect(filter.getByPlaceholder('Username')).toBeEnabled()
    await filter.getByPlaceholder('Username').fill('ana')
    await expect(filter.getByPlaceholder('Username')).toHaveValue('ana')
  })

  test('sees only the links it may open', async ({ page }) => {
    await openAs(page, 'viewer', '/')
    const menu = page.getByTestId('menu')
    await expect(menu.getByRole('link', { name: 'users' })).toBeVisible()
    await expect(menu.getByRole('link', { name: 'billing' })).toHaveCount(0)
    await expect(menu.getByRole('link', { name: 'settings' })).toHaveCount(0)
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

test('switching role does not leak the previous role cache', async ({
  page
}) => {
  await openAs(page, 'admin', '/users')
  await expect(page.getByTestId('new-user')).toBeVisible()

  await page.getByTestId('role').selectOption('viewer')
  await expect(page).toHaveURL(/\/$/)
  await page.getByTestId('menu').getByRole('link', { name: 'users' }).click()

  await expect(page.getByTestId('new-user')).toHaveCount(0)
  await expect(page.getByTestId('new-user-denied')).toBeVisible()
})

test('switching back to a stronger role restores access', async ({ page }) => {
  await openAs(page, 'viewer', '/')
  await expect(
    page.getByTestId('menu').getByRole('link', { name: 'billing' })
  ).toHaveCount(0)

  await page.getByTestId('role').selectOption('admin')

  await expect(
    page.getByTestId('menu').getByRole('link', { name: 'billing' })
  ).toBeVisible()
})
