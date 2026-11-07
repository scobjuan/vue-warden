import { mount } from '@vue/test-utils'
import type { Component } from 'vue'

import type { WardenOptions } from '../src/core/types'
import { createWarden } from '../src/plugin'
import { rawPage } from './fixtures'

/**
 * Creates a Warden with `users` loaded as the current page.
 * @param overrides - Option overrides.
 * @param page - Raw page returned by the fake backend.
 * @returns The ready instance.
 */
export async function readyWarden(
  overrides: Partial<WardenOptions> = {},
  page: unknown = rawPage
) {
  const warden = createWarden({
    fetchPermissions: () => Promise.resolve(page),
    ...overrides
  })
  await warden.store.load('users')
  warden.store.current.value = 'users'
  return warden
}

/**
 * Mounts a component with the plugin installed.
 * @param warden - Instance to install.
 * @param component - Component under test.
 * @returns The wrapper.
 */
export function mountWith(
  warden: ReturnType<typeof createWarden>,
  component: Component
) {
  return mount(component, {
    global: { plugins: [warden] },
    attachTo: document.body
  })
}
