import { deniedContext } from '../core/messages'
import type { WardenStore } from '../core/store'
import type {
  DeniedContext,
  ResolvedOptions,
  RouteLike,
  RouterLike
} from '../core/types'

/**
 * Resolves the permission key of a route.
 * `meta.warden` wins over the route name; `false` marks a public route.
 * @param route - Route being resolved.
 * @param protect - Global protection mode.
 * @returns The key to ask the backend for, or undefined for public routes.
 */
export function routeKey(
  route: RouteLike,
  protect: ResolvedOptions['protect']
): string | undefined {
  const meta = route.meta?.warden
  if (meta === false) return undefined
  if (typeof meta === 'string') return meta
  if (protect === 'marked' && meta !== true) return undefined
  return typeof route.name === 'string' ? route.name : undefined
}

export interface GuardDeps {
  router: RouterLike
  store: WardenStore
  options: ResolvedOptions
  deny: (ctx: DeniedContext) => void
}

function isForbiddenTarget(route: RouteLike, target: string): boolean {
  return route.name === target || route.path === target
}

function redirectTarget(
  router: RouterLike,
  target: string,
  from: string
): { name?: string; path?: string; query: Record<string, string> } {
  const query = { from }
  return router.hasRoute(target)
    ? { name: target, query }
    : { path: target, query }
}

/**
 * Registers the navigation guard that loads page permissions.
 * Uses return values (never `next()`) and never throws into the router.
 * @param deps - Router, store, options and the deny hook.
 * @returns A function that removes the guard.
 */
export function installGuard(deps: GuardDeps): () => void {
  const { router, store, options, deny } = deps
  const forbidden = options.forbiddenRoute

  // Full path of the latest navigation target (may still be in flight).
  let target = router.currentRoute.value.fullPath

  store.onRevoked = (key) => {
    // The store only fires this for the current page, so the key is trusted.
    deny(deniedContext('page', key))
    if (forbidden)
      void router.replace(redirectTarget(router, forbidden, target))
  }

  return router.beforeEach(async (to) => {
    target = to.fullPath
    const key = routeKey(to, options.protect)
    if (key === undefined || (forbidden && isForbiddenTarget(to, forbidden))) {
      store.current.value = undefined
      return true
    }

    // Warm pages are served instantly, so mark them current before the
    // background refresh can finish and detect a revocation.
    if (store.pages.has(key)) store.current.value = key
    const page = await store.load(key)
    store.current.value = key
    if (page.access) return true

    deny(deniedContext('page', key))
    return forbidden ? redirectTarget(router, forbidden, to.fullPath) : true
  })
}
