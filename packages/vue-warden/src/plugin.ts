import type { App } from 'vue'

import { Warden as WardenComponent } from './components/warden'
import { WardenField } from './components/warden-field'
import { WardenGate } from './components/warden-gate'
import { WARDEN_KEY } from './context'
import { resolveOptions } from './core/options'
import { safe } from './core/safe'
import { createStore, type WardenStore } from './core/store'
import type {
  DeniedContext,
  ResolvedOptions,
  RouterLike,
  WardenOptions
} from './core/types'
import { createDirective } from './directive/v-warden'
import { installGuard } from './router/guard'

/** Public instance returned by `createWarden`. */
export interface WardenInstance {
  readonly store: WardenStore
  readonly options: ResolvedOptions
  /** Vue plugin entry point. */
  install: (app: App) => void
  /** Attaches the navigation guard to a router (idempotent). */
  attachRouter: (router: RouterLike) => void
  /** Notifies `onDenied` safely. */
  deny: (ctx: DeniedContext) => void
}

/**
 * Creates a Warden instance. State lives in the instance, so it is SSR-safe.
 * @param userOptions - Package options.
 * @returns The Warden plugin instance.
 */
export function createWarden(userOptions: WardenOptions): WardenInstance {
  const options = resolveOptions(userOptions)
  const store = createStore(options)
  let removeGuard: (() => void) | undefined
  let attached: RouterLike | undefined

  const warden: WardenInstance = {
    store,
    options,
    deny: (ctx) => {
      safe(
        () => {
          options.onDenied?.(ctx)
        },
        options.onError,
        undefined
      )
    },
    attachRouter: (router) => {
      if (attached === router) return
      removeGuard?.()
      attached = router
      removeGuard = installGuard({ router, store, options, deny: warden.deny })
    },
    install: (app) => {
      app.provide(WARDEN_KEY, warden)
      app.component('Warden', WardenComponent)
      app.component('WardenField', WardenField)
      app.component('WardenGate', WardenGate)
      app.directive('warden', createDirective(warden))
      const router = (app.config.globalProperties as { $router?: RouterLike })
        .$router
      if (router) warden.attachRouter(router)
    }
  }
  return warden
}
