import type { Page } from '@playwright/test'

export type Role = 'admin' | 'editor' | 'viewer'

/** Opens the app as a given role (the example stores it in localStorage). */
export async function openAs(
  page: Page,
  role: Role,
  path = '/'
): Promise<void> {
  await page.addInitScript((value) => {
    localStorage.setItem('role', value)
  }, role)
  await page.goto(path)
}

/** Records every page key requested to the permissions endpoint. */
export function trackRequests(page: Page): string[] {
  const keys: string[] = []
  page.on('request', (request) => {
    if (request.url().endsWith('/api/permissions')) {
      keys.push((request.postDataJSON() as { pageKey: string }).pageKey)
    }
  })
  return keys
}
