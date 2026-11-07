import { describe, expect, it, vi } from 'vitest'
import { createApp, h, inject } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import { WARDEN_KEY } from '../../../src/context'
import type { RouterLike, WardenOptions } from '../../../src/core/types'
import { createWarden } from '../../../src/plugin'
import { routeKey } from '../../../src/router/guard'
import { rawPage } from '../../fixtures'

const Stub = { render: () => h('div') }

function setup(overrides: Partial<WardenOptions> = {}, access = true) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Stub },
      { path: '/users', name: 'users', component: Stub },
      {
        path: '/custom',
        name: 'other',
        component: Stub,
        meta: { warden: 'custom-key' }
      },
      {
        path: '/public',
        name: 'public',
        component: Stub,
        meta: { warden: false }
      },
      { path: '/forbidden', name: 'forbidden', component: Stub },
      { path: '/denied', component: Stub },
      {
        path: '/marked',
        name: 'marked',
        component: Stub,
        meta: { warden: true }
      }
    ]
  })
  const fetchPermissions = vi.fn((key: string) =>
    Promise.resolve({ ...rawPage, key, can_access: access })
  )
  const warden = createWarden({ fetchPermissions, ...overrides })
  warden.attachRouter(router as unknown as RouterLike)
  return { router, warden, fetchPermissions }
}

describe('routeKey', () => {
  const base = { path: '/', fullPath: '/' }
  it('prefers meta.warden, then the route name', () => {
    expect(routeKey({ ...base, name: 'a', meta: { warden: 'k' } }, 'all')).toBe(
      'k'
    )
    expect(routeKey({ ...base, name: 'a' }, 'all')).toBe('a')
  })
  it('returns undefined for public or unnamed routes', () => {
    expect(
      routeKey({ ...base, name: 'a', meta: { warden: false } }, 'all')
    ).toBeUndefined()
    expect(routeKey({ ...base }, 'all')).toBeUndefined()
    expect(routeKey({ ...base, name: Symbol('s') }, 'all')).toBeUndefined()
  })
  it('only protects marked routes in marked mode', () => {
    expect(routeKey({ ...base, name: 'a' }, 'marked')).toBeUndefined()
    expect(
      routeKey({ ...base, name: 'a', meta: { warden: true } }, 'marked')
    ).toBe('a')
    expect(
      routeKey({ ...base, name: 'a', meta: { warden: 'k' } }, 'marked')
    ).toBe('k')
  })
})

describe('navigation guard', () => {
  it('loads permissions and allows navigation', async () => {
    const { router, warden, fetchPermissions } = setup()
    await router.push('/users')
    expect(router.currentRoute.value.name).toBe('users')
    expect(fetchPermissions).toHaveBeenCalledWith('users', expect.anything())
    expect(warden.store.current.value).toBe('users')
  })

  it('uses meta.warden as key and skips public routes', async () => {
    const { router, warden, fetchPermissions } = setup()
    await router.push('/custom')
    expect(fetchPermissions).toHaveBeenCalledWith(
      'custom-key',
      expect.anything()
    )
    fetchPermissions.mockClear()
    await router.push('/public')
    expect(fetchPermissions).not.toHaveBeenCalled()
    expect(warden.store.current.value).toBeUndefined()
  })

  it('redirects denied pages to the forbidden route with the origin', async () => {
    const onDenied = vi.fn()
    const { router } = setup({ forbiddenRoute: 'forbidden', onDenied }, false)
    await router.push('/users')
    expect(router.currentRoute.value.name).toBe('forbidden')
    expect(router.currentRoute.value.query.from).toBe('/users')
    expect(onDenied).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'page', target: 'users' })
    )
  })

  it('supports a path as forbidden target', async () => {
    const { router } = setup({ forbiddenRoute: '/denied' }, false)
    await router.push('/users')
    expect(router.currentRoute.value.path).toBe('/denied')
    expect(router.currentRoute.value.query.from).toBe('/users')
  })

  it('keeps the query string of the denied target in `from`', async () => {
    const { router } = setup({ forbiddenRoute: 'forbidden' }, false)
    await router.push('/users?tab=2')
    expect(router.currentRoute.value.query.from).toBe('/users?tab=2')
  })

  it('does not loop when the forbidden route is given as a path', async () => {
    const { router, fetchPermissions } = setup(
      { forbiddenRoute: '/denied' },
      false
    )
    await router.push('/denied')
    expect(router.currentRoute.value.path).toBe('/denied')
    expect(fetchPermissions).not.toHaveBeenCalled()
  })

  it('leaves no current page after landing on the forbidden route', async () => {
    const { router, warden } = setup({ forbiddenRoute: 'forbidden' }, false)
    await router.push('/users')
    expect(warden.store.current.value).toBeUndefined()
  })

  it('only protects marked routes when protect is marked', async () => {
    const { router, fetchPermissions } = setup({ protect: 'marked' })
    await router.push('/users')
    expect(fetchPermissions).not.toHaveBeenCalled()
    await router.push('/marked')
    expect(fetchPermissions).toHaveBeenCalledWith('marked', expect.anything())
  })

  it('does not call onDenied for allowed pages', async () => {
    const onDenied = vi.fn()
    const { router } = setup({ onDenied, forbiddenRoute: 'forbidden' })
    await router.push('/users')
    expect(onDenied).not.toHaveBeenCalled()
  })

  it('serves warm pages without waiting for the backend again', async () => {
    const { router, fetchPermissions } = setup()
    await router.push('/users')
    await router.push('/')
    await router.push('/users')
    expect(fetchPermissions).toHaveBeenCalledTimes(2)
  })

  it('does not redirect a denied navigation twice', async () => {
    const onDenied = vi.fn()
    const { router } = setup({ forbiddenRoute: 'forbidden', onDenied }, false)
    await router.push('/users')
    expect(onDenied).toHaveBeenCalledTimes(1)
  })

  it('keeps navigating when onDenied throws', async () => {
    const onError = vi.fn()
    const { router } = setup(
      {
        forbiddenRoute: 'forbidden',
        onError,
        onDenied: () => {
          throw new Error('hook')
        }
      },
      false
    )
    await router.push('/users')
    expect(router.currentRoute.value.name).toBe('forbidden')
    expect(onError).toHaveBeenCalled()
  })

  it('does not fetch for unnamed routes without meta', async () => {
    const { router, fetchPermissions } = setup()
    await router.push('/denied')
    expect(fetchPermissions).not.toHaveBeenCalled()
  })

  it('does not loop on the forbidden route', async () => {
    const { router, fetchPermissions } = setup(
      { forbiddenRoute: 'forbidden' },
      false
    )
    await router.push('/forbidden')
    expect(router.currentRoute.value.name).toBe('forbidden')
    expect(fetchPermissions).not.toHaveBeenCalled()
  })

  it('lets denied pages through when no forbidden route is configured', async () => {
    const { router, warden } = setup({}, false)
    await router.push('/users')
    expect(router.currentRoute.value.name).toBe('users')
    expect(warden.store.pages.get('users')?.access).toBe(false)
  })

  it('never breaks navigation when the backend fails', async () => {
    const { router } = setup({
      fetchPermissions: () => Promise.reject(new Error('down')),
      onError: () => undefined
    })
    await router.push('/users')
    expect(router.currentRoute.value.name).toBe('users')
  })
})

describe('createWarden', () => {
  it('fires onDenied safely even when the hook throws', () => {
    const onError = vi.fn()
    const warden = createWarden({
      fetchPermissions: () => Promise.resolve({}),
      onDenied: () => {
        throw new Error('x')
      },
      onError
    })
    expect(() => {
      warden.deny({ kind: 'page', target: 'k', message: 'm' })
    }).not.toThrow()
    expect(onError).toHaveBeenCalled()
  })

  it('auto-attaches the router found on the app and is idempotent', async () => {
    const { router, warden } = setup()
    const app = createApp(Stub)
    app.config.globalProperties.$router = router
    app.use(warden)
    warden.attachRouter(router as unknown as RouterLike)
    await router.push('/users')
    expect(warden.store.current.value).toBe('users')
  })

  it('installs without a router', () => {
    const warden = createWarden({ fetchPermissions: () => Promise.resolve({}) })
    expect(() => createApp(Stub).use(warden)).not.toThrow()
  })

  it('provides the instance and registers components and the directive', () => {
    const warden = createWarden({ fetchPermissions: () => Promise.resolve({}) })
    const app = createApp(Stub)
    app.use(warden)
    expect(app.runWithContext(() => inject(WARDEN_KEY))).toBe(warden)
    for (const name of ['Warden', 'WardenField', 'WardenGate']) {
      expect(app.component(name)).toBeDefined()
    }
    expect(app.directive('warden')).toBeDefined()
  })

  it('keeps state per instance so two apps never share permissions', async () => {
    const a = createWarden({ fetchPermissions: () => Promise.resolve(rawPage) })
    const b = createWarden({ fetchPermissions: () => Promise.resolve(rawPage) })
    await a.store.load('users')
    expect(a.store.pages.has('users')).toBe(true)
    expect(b.store.pages.has('users')).toBe(false)
  })

  it('moves the guard when attached to a different router', async () => {
    const first = setup()
    const second = setup()
    first.warden.attachRouter(second.router as unknown as RouterLike)
    await first.router.push('/users')
    expect(first.fetchPermissions).not.toHaveBeenCalled()
    await second.router.push('/users')
    expect(first.warden.store.current.value).toBe('users')
  })

  it('rejects missing fetchers early', () => {
    expect(() => createWarden({} as never)).toThrow(TypeError)
  })
})

describe('revocation', () => {
  function revocable(overrides: Partial<WardenOptions> = {}) {
    const state = { access: true }
    const ctx = setup({
      ttl: 0,
      fetchPermissions: (key: string) =>
        Promise.resolve({
          ...rawPage,
          key,
          can_access: key === 'users' ? state.access : true
        }),
      ...overrides
    })
    return { ...ctx, state }
  }

  it('redirects to the forbidden route when a refresh revokes the current page', async () => {
    const { router, state } = revocable({ forbiddenRoute: 'forbidden' })
    await router.push('/users')
    state.access = false
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('home')
    await router.push('/users')
    await vi.waitFor(() => {
      expect(router.currentRoute.value.name).toBe('forbidden')
    })
  })

  it('notifies onDenied with kind page when a refresh revokes access', async () => {
    const onDenied = vi.fn()
    const { router, state } = revocable({ onDenied })
    await router.push('/users')
    state.access = false
    await router.push('/')
    await router.push('/users')
    await vi.waitFor(() => {
      expect(onDenied).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'page', target: 'users' })
      )
    })
  })

  it('does not redirect when there is no forbidden route', async () => {
    const { router, state, warden } = revocable()
    await router.push('/users')
    state.access = false
    await router.push('/')
    await router.push('/users')
    await vi.waitFor(() => {
      expect(warden.store.pages.get('users')?.access).toBe(false)
    })
    expect(router.currentRoute.value.name).toBe('users')
  })

  it('does not redirect when the revoked page is no longer the current one', async () => {
    const { router, state, warden } = revocable({ forbiddenRoute: 'forbidden' })
    await router.push('/users')
    await router.push('/')
    state.access = false
    await router.push('/users')
    await router.push('/')
    await new Promise((r) => setTimeout(r, 20))
    expect(warden.store.pages.get('users')?.access).toBe(false)
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('reports the current location in `from` when redirecting', async () => {
    const { router, state } = revocable({ forbiddenRoute: 'forbidden' })
    await router.push('/users?tab=1')
    state.access = false
    await router.push('/')
    await router.push('/users?tab=1')
    await vi.waitFor(() => {
      expect(router.currentRoute.value.name).toBe('forbidden')
    })
    expect(router.currentRoute.value.query.from).toBe('/users?tab=1')
  })
})
