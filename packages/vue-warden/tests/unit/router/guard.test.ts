import { describe, expect, it, vi } from 'vitest'
import { createApp, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

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
      { path: '/forbidden', name: 'forbidden', component: Stub }
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
    const { router } = setup({ forbiddenRoute: '/nope' }, false)
    await router.push('/users').catch(() => undefined)
    expect(router.currentRoute.value.path).not.toBe('/users')
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

  it('redirects when a background refresh revokes the current page', async () => {
    let access = true
    const { router } = setup({
      ttl: 0,
      forbiddenRoute: 'forbidden',
      fetchPermissions: () =>
        Promise.resolve({ ...rawPage, can_access: access })
    })
    await router.push('/users')
    access = false
    await router.push('/')
    await router.push('/users')
    await vi.waitFor(() => {
      expect(router.currentRoute.value.name).toBe('forbidden')
    })
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

  it('rejects missing fetchers early', () => {
    expect(() => createWarden({} as never)).toThrow(TypeError)
  })
})
