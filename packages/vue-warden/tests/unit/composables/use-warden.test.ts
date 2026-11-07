import { flushPromises } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'

import { useWarden, type WardenApi } from '../../../src/composables/use-warden'
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
})
