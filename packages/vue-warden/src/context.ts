import { inject, type InjectionKey } from 'vue'

import type { WardenStore } from './core/store'
import type { PagePermission } from './core/types'
import type { WardenInstance } from './plugin'

/** Injection key of the active Warden instance. */
export const WARDEN_KEY: InjectionKey<WardenInstance> = Symbol('vue-warden')

/** Context provided by `<Warden>` to its descendants. */
export interface ComponentContext {
  readonly component: string
  readonly route: string | undefined
}

/** Injection key of the surrounding `<Warden>` context. */
export const COMPONENT_KEY: InjectionKey<ComponentContext> = Symbol(
  'vue-warden:component'
)

/**
 * Injects the Warden instance.
 * @returns The instance installed with `app.use(warden)`.
 * @throws {Error} When the plugin was not installed.
 */
export function useWardenInstance(): WardenInstance {
  const warden = inject(WARDEN_KEY, undefined)
  if (!warden) throw new Error('vue-warden: install the plugin with app.use()')
  return warden
}

/**
 * Reads the page that applies to a component tree.
 * @param store - Permission store.
 * @param route - Explicit page key, otherwise the current page is used.
 * @returns The page permission if it is loaded.
 */
export function pageFor(
  store: WardenStore,
  route?: string
): PagePermission | undefined {
  const key = route ?? store.current.value
  return key === undefined ? undefined : store.pages.get(key)
}
