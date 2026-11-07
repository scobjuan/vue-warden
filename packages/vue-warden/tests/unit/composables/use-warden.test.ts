import { flushPromises } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import { useWarden, type WardenApi } from '../../../src/composables/use-warden'
import { rawPage } from '../../fixtures'
import { mountWith, readyWarden } from '../../helpers'

async function api(overrides = {}) {
  const warden = await readyWarden(overrides)
  let result!: WardenApi
  mountWith(
    warden,
    defineComponent({
      setup() {
        result = useWarden()
        return () => null
      }
    })
  )
  return { api: result, warden }
}

describe('useWarden', () => {
  it('answers can / canView / canEdit for components and inputs', async () => {
    const { api: w } = await api()
    expect(w.can('filter')).toBe(true)
    expect(w.can('billing')).toBe(false)
    expect(w.can('filter.username')).toBe(true)
    expect(w.can('filter.email')).toBe(false)
    expect(w.canView('filter.email')).toBe(true)
    expect(w.canView('filter.password')).toBe(false)
    expect(w.canView('billing')).toBe(false)
    expect(w.canEdit('filter.username')).toBe(true)
  })

  it('guard runs allowed actions and reports denied ones', async () => {
    const onDenied = vi.fn()
    const { api: w } = await api({ onDenied })
    const fn = vi.fn(() => 42)
    expect(w.guard('filter.username', fn)).toBe(42)
    expect(w.guard('filter.email', fn)).toBeUndefined()
    expect(w.guard('billing', fn)).toBeUndefined()
    expect(fn).toHaveBeenCalledTimes(1)
    expect(onDenied).toHaveBeenCalledTimes(2)
    expect(onDenied).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ kind: 'input', target: 'filter.email' })
    )
    expect(onDenied).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'component', target: 'billing' })
    )
  })

  it('canAccessRoute loads unknown routes on demand and then answers', async () => {
    const { api: w, warden } = await api()
    expect(w.canAccessRoute('settings')).toBe(false)
    await flushPromises()
    expect(warden.store.pages.has('settings')).toBe(true)
    expect(w.canAccessRoute('settings')).toBe(true)
  })

  it('canAccessRoute assumes access under the allow policy while loading', async () => {
    const { api: w } = await api({ onMissing: 'allow' })
    expect(w.canAccessRoute('settings')).toBe(true)
  })

  it('prefetch, invalidate and clear delegate to the store', async () => {
    const { api: w, warden } = await api()
    await w.prefetch(['a', 'b'])
    expect(warden.store.pages.has('b')).toBe(true)
    await w.invalidate('a')
    w.clear()
    expect(warden.store.pages.size).toBe(0)
  })

  it('throws a clear error when the plugin is not installed', () => {
    expect(() =>
      mount(
        defineComponent({
          setup() {
            useWarden()
            return () => null
          }
        })
      )
    ).toThrow(/install the plugin/)
  })

  it('canView on a component mirrors component access', async () => {
    const { api: w } = await api()
    expect(w.canView('filter')).toBe(true)
    expect(w.canView('billing')).toBe(false)
    expect(w.canView('unknown')).toBe(false)
  })

  it('applies the missing policy to unknown paths', async () => {
    const deny = await api()
    expect(deny.api.can('nope.x')).toBe(false)
    expect(deny.api.canView('nope')).toBe(false)
    const allow = await api({ onMissing: 'allow' })
    expect(allow.api.can('nope.x')).toBe(true)
    expect(allow.api.canView('nope')).toBe(true)
  })

  it('denies everything when no page is loaded', async () => {
    const { api: w, warden } = await api()
    warden.store.clear()
    expect(w.can('filter')).toBe(false)
    expect(w.canView('filter.username')).toBe(false)
  })

  it('denies everything on a denied page, even under allow', async () => {
    const warden = await readyWarden(
      { onMissing: 'allow' },
      { key: 'users', can_access: false, components: [] }
    )
    let w!: WardenApi
    mountWith(
      warden,
      defineComponent({
        setup() {
          w = useWarden()
          return () => null
        }
      })
    )
    expect(w.can('filter')).toBe(false)
    expect(w.can('filter.username')).toBe(false)
  })

  it('guard does not swallow errors thrown by an allowed action', async () => {
    const { api: w } = await api()
    const action = (): never => {
      throw new Error('app bug')
    }
    expect(() => {
      w.guard('filter.username', action)
    }).toThrow('app bug')
  })

  it('guard reports a path without dot as component', async () => {
    const onDenied = vi.fn()
    const { api: w } = await api({ onDenied })
    const fn = vi.fn()
    w.guard('billing', fn)
    expect(fn).not.toHaveBeenCalled()
    expect(onDenied).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'component', target: 'billing' })
    )
  })

  it('canAccessRoute reflects denied pages and does not refetch loaded ones', async () => {
    const fetchPermissions = vi.fn((key: string) =>
      Promise.resolve({ ...rawPage, key, can_access: key !== 'secret' })
    )
    const { api: w } = await api({ fetchPermissions })
    fetchPermissions.mockClear()
    expect(w.canAccessRoute('secret')).toBe(false)
    await flushPromises()
    expect(w.canAccessRoute('secret')).toBe(false)
    expect(w.canAccessRoute('open')).toBe(false)
    await flushPromises()
    expect(w.canAccessRoute('open')).toBe(true)
    w.canAccessRoute('open')
    w.canAccessRoute('secret')
    expect(fetchPermissions).toHaveBeenCalledTimes(2)
  })

  it('canAccessRoute is reactive inside a render function', async () => {
    const warden = await readyWarden()
    const wrapper = mountWith(
      warden,
      defineComponent({
        setup() {
          const w = useWarden()
          return () => h('i', String(w.canAccessRoute('settings')))
        }
      })
    )
    expect(wrapper.text()).toBe('false')
    await flushPromises()
    expect(wrapper.text()).toBe('true')
  })

  it('uses the route of the surrounding <Warden>', async () => {
    const warden = await readyWarden()
    await warden.store.load('other')
    warden.store.pages.set(
      'other',
      Object.freeze({
        ...warden.store.pages.get('other')!,
        components: new Map([
          ['only-other', { access: true, inputs: new Map() }]
        ])
      })
    )
    let inside!: WardenApi
    const Child = defineComponent({
      setup() {
        inside = useWarden()
        return () => null
      }
    })
    mountWith(
      warden,
      defineComponent({
        components: { Child },
        template:
          '<Warden component-key="only-other" route="other"><Child /></Warden>'
      })
    )
    expect(inside.can('only-other')).toBe(true)
    expect(inside.can('filter')).toBe(false)
  })

  it('invalidate reloads the current page', async () => {
    const fetchPermissions = vi.fn(() => Promise.resolve(rawPage))
    const { api: w } = await api({ fetchPermissions })
    fetchPermissions.mockClear()
    await w.invalidate()
    expect(fetchPermissions).toHaveBeenCalledTimes(1)
  })

  it('clear removes the current page so access fails closed', async () => {
    const { api: w, warden } = await api()
    w.clear()
    expect(warden.store.current.value).toBeUndefined()
    expect(w.can('filter')).toBe(false)
  })
})
