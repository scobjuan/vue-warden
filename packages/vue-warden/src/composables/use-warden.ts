import { inject } from 'vue'

import { COMPONENT_KEY, pageFor, useWardenInstance } from '../context'
import { deniedContext } from '../core/messages'
import { resolveComponent, resolveInput, splitKey } from '../core/resolve'

/** Imperative, reactive permission API for code and templates. */
export interface WardenApi {
  /** `component` -> component access; `component.input` -> can edit. */
  can: (path: string) => boolean
  /** `component` -> component access; `component.input` -> can view. */
  canView: (path: string) => boolean
  /** Alias of `can`. */
  canEdit: (path: string) => boolean
  /** Whether the user may enter a route (loads it on demand, deduped). */
  canAccessRoute: (key: string) => boolean
  /** Runs `fn` when allowed; otherwise notifies `onDenied` and returns undefined. */
  guard: <T>(path: string, fn: () => T) => T | undefined
  /** Loads permissions of several routes ahead of time. */
  prefetch: (keys: string[]) => Promise<void>
  /** Marks cached pages stale (and reloads the current one). */
  invalidate: (key?: string) => Promise<void>
  /** Drops all permissions, e.g. on logout. */
  clear: () => void
}

/**
 * Access the permission API from `setup()`.
 * @returns The reactive permission API.
 */
export function useWarden(): WardenApi {
  const warden = useWardenInstance()
  const { store, options } = warden
  const route = inject(COMPONENT_KEY, undefined)?.route

  function can(path: string): boolean {
    const [component, input] = splitKey(path)
    const page = pageFor(store, route)
    return input === ''
      ? resolveComponent(page, component, options.onMissing)
      : resolveInput(page, component, input, options.onMissing).edit
  }

  function canView(path: string): boolean {
    const [component, input] = splitKey(path)
    const page = pageFor(store, route)
    return input === ''
      ? resolveComponent(page, component, options.onMissing)
      : resolveInput(page, component, input, options.onMissing).view
  }

  function canAccessRoute(key: string): boolean {
    const page = store.pages.get(key)
    if (!page) {
      void store.load(key)
      return options.onMissing === 'allow'
    }
    return page.access
  }

  function guard<T>(path: string, fn: () => T): T | undefined {
    if (can(path)) return fn()
    warden.deny(deniedContext(path.includes('.') ? 'input' : 'component', path))
    return undefined
  }

  return {
    can,
    canView,
    canEdit: can,
    canAccessRoute,
    guard,
    prefetch: (keys) => store.prefetch(keys),
    invalidate: (key) => store.invalidate(key),
    clear: () => {
      store.clear()
    }
  }
}
