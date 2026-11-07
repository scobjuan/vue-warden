import { describe, expect, it, vi } from 'vitest'

import { resolveOptions } from '../../../src/core/options'
import { createStore } from '../../../src/core/store'
import type { WardenOptions } from '../../../src/core/types'
import { rawPage } from '../../fixtures'

function make(overrides: Partial<WardenOptions> = {}) {
  const fetchPermissions = vi.fn((key: string) =>
    Promise.resolve({ ...rawPage, key })
  )
  const options = resolveOptions({ fetchPermissions, ...overrides })
  return { store: createStore(options), fetchPermissions }
}

describe('store.load', () => {
  it('fetches, normalizes and publishes a page', async () => {
    const { store } = make()
    const page = await store.load('users')
    expect(page.access).toBe(true)
    expect(store.pages.get('users')).toBe(page)
  })

  it('serves fresh cache without fetching again', async () => {
    const { store, fetchPermissions } = make()
    await store.load('users')
    await store.load('users')
    expect(fetchPermissions).toHaveBeenCalledTimes(1)
  })

  it('applies transform before normalizing', async () => {
    const { store } = make({
      fetchPermissions: () => Promise.resolve({ data: rawPage }),
      transform: (raw) => (raw as { data: unknown }).data
    })
    expect((await store.load('users')).components.size).toBe(2)
  })

  it('serves stale data instantly and revalidates in background', async () => {
    const { store, fetchPermissions } = make({ ttl: 0 })
    await store.load('users')
    const stale = await store.load('users')
    expect(stale.access).toBe(true)
    await vi.waitFor(() => {
      expect(fetchPermissions).toHaveBeenCalledTimes(2)
    })
  })

  it('waits for fresh data when SWR is disabled', async () => {
    const { store, fetchPermissions } = make({
      ttl: 0,
      staleWhileRevalidate: false
    })
    await store.load('users')
    await store.load('users')
    expect(fetchPermissions).toHaveBeenCalledTimes(2)
  })

  it('fires onRevoked when a refresh removes access to the current page', async () => {
    let access = true
    const { store } = make({
      ttl: 0,
      fetchPermissions: () =>
        Promise.resolve({ ...rawPage, can_access: access })
    })
    const onRevoked = vi.fn()
    store.onRevoked = onRevoked
    store.current.value = 'users'
    await store.load('users')
    access = false
    await store.load('users')
    await vi.waitFor(() => {
      expect(onRevoked).toHaveBeenCalledWith('users')
    })
    expect(store.pages.get('users')?.access).toBe(false)
  })

  it('does not fire onRevoked for pages that are not current', async () => {
    let access = true
    const { store } = make({
      ttl: 0,
      fetchPermissions: () =>
        Promise.resolve({ ...rawPage, can_access: access })
    })
    const onRevoked = vi.fn()
    store.onRevoked = onRevoked
    store.current.value = 'other'
    await store.load('users')
    access = false
    await store.load('users')
    await vi.waitFor(() => {
      expect(store.pages.get('users')?.access).toBe(false)
    })
    expect(onRevoked).not.toHaveBeenCalled()
  })

  it('denies and reports when the first load fails', async () => {
    const onError = vi.fn()
    const { store } = make({
      fetchPermissions: () => Promise.reject(new Error('down')),
      onError
    })
    const page = await store.load('users')
    expect(page).toMatchObject({ access: false, fallback: true })
    expect(onError).toHaveBeenCalledOnce()
  })

  it('allows on failure when onMissing is allow', async () => {
    const { store } = make({
      fetchPermissions: () => Promise.reject(new Error('down')),
      onMissing: 'allow'
    })
    expect((await store.load('users')).access).toBe(true)
  })

  it('keeps previous data when a blocking refresh fails', async () => {
    let fail = false
    const { store } = make({
      ttl: 0,
      staleWhileRevalidate: false,
      fetchPermissions: () =>
        fail ? Promise.reject(new Error('x')) : Promise.resolve(rawPage)
    })
    await store.load('users')
    fail = true
    const page = await store.load('users')
    expect(page.fallback).toBe(false)
    expect(page.access).toBe(true)
  })

  it('reports background refresh failures without throwing', async () => {
    let fail = false
    const onError = vi.fn()
    const { store } = make({
      ttl: 0,
      onError,
      fetchPermissions: () =>
        fail ? Promise.reject(new Error('x')) : Promise.resolve(rawPage)
    })
    await store.load('users')
    fail = true
    await store.load('users')
    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalled()
    })
  })

  it('times out slow backends', async () => {
    const onError = vi.fn()
    const { store } = make({
      timeout: 5,
      onError,
      fetchPermissions: () => new Promise(() => undefined)
    })
    expect((await store.load('users')).fallback).toBe(true)
    expect(onError).toHaveBeenCalled()
  })

  it('treats invalid payloads as errors', async () => {
    const onError = vi.fn()
    const { store } = make({
      fetchPermissions: () => Promise.resolve(null),
      onError
    })
    expect((await store.load('users')).fallback).toBe(true)
    expect(onError).toHaveBeenCalled()
  })
})

describe('store.prefetch', () => {
  it('uses the batch fetcher for several keys', async () => {
    const fetchManyPermissions = vi.fn((keys: string[]) =>
      Promise.resolve(
        Object.fromEntries(keys.map((k) => [k, { ...rawPage, key: k }]))
      )
    )
    const { store, fetchPermissions } = make({ fetchManyPermissions })
    await store.prefetch(['a', 'b'])
    expect(fetchManyPermissions).toHaveBeenCalledOnce()
    expect(fetchPermissions).not.toHaveBeenCalled()
    expect(store.pages.has('a')).toBe(true)
    await store.prefetch(['a', 'b'])
    expect(fetchManyPermissions).toHaveBeenCalledOnce()
  })

  it('falls back to parallel single requests', async () => {
    const { store, fetchPermissions } = make()
    await store.prefetch(['a', 'b'])
    expect(fetchPermissions).toHaveBeenCalledTimes(2)
  })

  it('falls back to single requests when the batch fails', async () => {
    const onError = vi.fn()
    const { store, fetchPermissions } = make({
      fetchManyPermissions: () => Promise.reject(new Error('x')),
      onError
    })
    await store.prefetch(['a', 'b'])
    expect(fetchPermissions).toHaveBeenCalledTimes(2)
    expect(onError).toHaveBeenCalledOnce()
  })

  it('skips keys missing from the batch response', async () => {
    const { store, fetchPermissions } = make({
      fetchManyPermissions: () => Promise.resolve({ a: rawPage })
    })
    await store.prefetch(['a', 'b'])
    expect(store.pages.has('a')).toBe(true)
    expect(store.pages.has('b')).toBe(false)
    expect(fetchPermissions).not.toHaveBeenCalled()
  })
})

describe('store.invalidate and clear', () => {
  it('reloads the current page on invalidate', async () => {
    const { store, fetchPermissions } = make()
    store.current.value = 'users'
    await store.load('users')
    await store.invalidate()
    expect(fetchPermissions).toHaveBeenCalledTimes(2)
  })

  it('invalidates a specific key without reloading other pages', async () => {
    const { store, fetchPermissions } = make()
    await store.load('a')
    await store.invalidate('a')
    expect(fetchPermissions).toHaveBeenCalledTimes(1)
    await store.invalidate()
    expect(fetchPermissions).toHaveBeenCalledTimes(1)
  })

  it('clears pages and current key', async () => {
    const { store } = make()
    store.current.value = 'users'
    await store.load('users')
    store.clear()
    expect(store.pages.size).toBe(0)
    expect(store.current.value).toBeUndefined()
  })
})

describe('store.load edge cases', () => {
  it('dedupes concurrent loads of the same key', async () => {
    const { store, fetchPermissions } = make()
    const [a, b] = await Promise.all([store.load('users'), store.load('users')])
    expect(a).toBe(b)
    expect(fetchPermissions).toHaveBeenCalledTimes(1)
  })

  it('passes the key to transform and treats a throwing transform as an error', async () => {
    const onError = vi.fn()
    const transform = vi.fn(() => {
      throw new Error('bad shape')
    })
    const { store } = make({ transform, onError })
    const page = await store.load('users')
    expect(transform).toHaveBeenCalledWith(expect.anything(), 'users')
    expect(page).toMatchObject({ access: false, fallback: true })
    expect(onError).toHaveBeenCalledOnce()
  })

  it('retries after a failed first load instead of caching the fallback', async () => {
    let fail = true
    const { store } = make({
      fetchPermissions: vi.fn(() =>
        fail ? Promise.reject(new Error('x')) : Promise.resolve(rawPage)
      ),
      onError: () => undefined
    })
    expect((await store.load('users')).fallback).toBe(true)
    fail = false
    const page = await store.load('users')
    expect(page.fallback).toBe(false)
    expect(page.access).toBe(true)
    expect(store.pages.get('users')).toBe(page)
  })

  it('does not throw when onError itself throws', async () => {
    const { store } = make({
      fetchPermissions: () => Promise.reject(new Error('x')),
      onError: () => {
        throw new Error('reporter broke')
      }
    })
    await expect(store.load('users')).resolves.toMatchObject({
      fallback: true
    })
  })

  it('passes an abort signal to the fetcher and aborts it on timeout', async () => {
    let signal!: AbortSignal
    const { store } = make({
      timeout: 5,
      fetchPermissions: (_key: string, ctx) => {
        signal = ctx.signal
        return new Promise(() => undefined)
      },
      onError: () => undefined
    })
    expect(signal).toBeUndefined()
    const loading = store.load('users')
    expect(signal.aborted).toBe(false)
    await loading
    expect(signal.aborted).toBe(true)
  })

  it('reports a descriptive timeout error', async () => {
    const onError = vi.fn()
    const { store } = make({
      timeout: 5,
      fetchPermissions: () => new Promise(() => undefined),
      onError
    })
    await store.load('users')
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('timed out') })
    )
  })

  it('does not abort a request that finishes before the timeout', async () => {
    vi.useFakeTimers()
    try {
      let signal!: AbortSignal
      const { store } = make({
        timeout: 1000,
        fetchPermissions: (_key: string, ctx) => {
          signal = ctx.signal
          return Promise.resolve(rawPage)
        }
      })
      await store.load('users')
      await vi.advanceTimersByTimeAsync(5000)
      expect(signal.aborted).toBe(false)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not fire onRevoked when access is restored or stays denied', async () => {
    const answers = [false, true, true]
    const { store } = make({
      ttl: 0,
      staleWhileRevalidate: false,
      fetchPermissions: () =>
        Promise.resolve({ ...rawPage, can_access: answers.shift() })
    })
    const onRevoked = vi.fn()
    store.onRevoked = onRevoked
    store.current.value = 'users'
    await store.load('users')
    await store.load('users')
    await store.load('users')
    expect(onRevoked).not.toHaveBeenCalled()
  })

  it('does not throw on revocation when nobody listens', async () => {
    let access = true
    const { store } = make({
      ttl: 0,
      staleWhileRevalidate: false,
      fetchPermissions: () =>
        Promise.resolve({ ...rawPage, can_access: access })
    })
    store.current.value = 'users'
    await store.load('users')
    access = false
    await expect(store.load('users')).resolves.toMatchObject({ access: false })
  })

  it('shares one background refresh between concurrent stale reads', async () => {
    const { store, fetchPermissions } = make({ ttl: 0 })
    await store.load('users')
    await Promise.all([store.load('users'), store.load('users')])
    await vi.waitFor(() => {
      expect(fetchPermissions).toHaveBeenCalledTimes(2)
    })
    await new Promise((r) => setTimeout(r, 10))
    expect(fetchPermissions).toHaveBeenCalledTimes(2)
  })

  it('serves the stale page while the background refresh is pending', async () => {
    let resolve!: (value: unknown) => void
    const results: Promise<unknown>[] = [Promise.resolve(rawPage)]
    const { store } = make({
      ttl: 0,
      fetchPermissions: () =>
        results.shift() ??
        new Promise((r) => {
          resolve = r
        })
    })
    await store.load('users')
    const stale = await store.load('users')
    expect(stale.access).toBe(true)
    resolve({ ...rawPage, can_access: false })
    await vi.waitFor(() => {
      expect(store.pages.get('users')?.access).toBe(false)
    })
  })

  it('clear drops the cache so the next load fetches again', async () => {
    const { store, fetchPermissions } = make()
    await store.load('users')
    store.clear()
    await store.load('users')
    expect(fetchPermissions).toHaveBeenCalledTimes(2)
  })

  it('keeps pages independent per key', async () => {
    const { store } = make({
      fetchPermissions: (key: string) =>
        Promise.resolve({ ...rawPage, key, can_access: key === 'a' })
    })
    expect((await store.load('a')).access).toBe(true)
    expect((await store.load('b')).access).toBe(false)
    expect(store.pages.get('a')?.access).toBe(true)
  })
})

describe('store.prefetch edge cases', () => {
  it('does nothing for an empty list or fresh pages', async () => {
    const { store, fetchPermissions } = make()
    await store.prefetch([])
    await store.load('a')
    await store.prefetch(['a'])
    expect(fetchPermissions).toHaveBeenCalledTimes(1)
  })

  it('only requests the keys that are not fresh', async () => {
    const fetchManyPermissions = vi.fn((keys: string[]) =>
      Promise.resolve(Object.fromEntries(keys.map((k) => [k, rawPage])))
    )
    const { store } = make({ fetchManyPermissions })
    await store.load('a')
    await store.prefetch(['a', 'b', 'c'])
    expect(fetchManyPermissions).toHaveBeenCalledWith(
      ['b', 'c'],
      expect.anything()
    )
  })

  it('uses the single fetcher when only one key is missing', async () => {
    const fetchManyPermissions = vi.fn(() => Promise.resolve({}))
    const { store, fetchPermissions } = make({ fetchManyPermissions })
    await store.prefetch(['a'])
    expect(fetchManyPermissions).not.toHaveBeenCalled()
    expect(fetchPermissions).toHaveBeenCalledOnce()
  })

  it('keeps valid batch entries and retries only the malformed one', async () => {
    const onError = vi.fn()
    const { store, fetchPermissions } = make({
      fetchManyPermissions: () => Promise.resolve({ a: rawPage, b: null }),
      onError
    })
    await store.prefetch(['a', 'b'])
    expect(onError).toHaveBeenCalledOnce()
    expect(fetchPermissions).toHaveBeenCalledTimes(1)
    expect(fetchPermissions).toHaveBeenCalledWith('b', expect.anything())
    expect(store.pages.get('a')?.access).toBe(true)
    expect(store.pages.get('b')?.access).toBe(true)
  })

  it('times out a hanging batch and recovers with single requests', async () => {
    const onError = vi.fn()
    const { store, fetchPermissions } = make({
      timeout: 5,
      fetchManyPermissions: () => new Promise(() => undefined),
      onError
    })
    await store.prefetch(['a', 'b'])
    expect(onError).toHaveBeenCalledOnce()
    expect(fetchPermissions).toHaveBeenCalledTimes(2)
  })

  it('applies transform to every batch entry', async () => {
    const { store } = make({
      fetchManyPermissions: () =>
        Promise.resolve({ a: { data: rawPage }, b: { data: rawPage } }),
      transform: (raw) => (raw as { data: unknown }).data
    })
    await store.prefetch(['a', 'b'])
    expect(store.pages.get('a')?.components.size).toBe(2)
    expect(store.pages.get('b')?.components.size).toBe(2)
  })

  it('makes prefetched pages fresh for later loads', async () => {
    const { store, fetchPermissions } = make({
      fetchManyPermissions: (keys: string[]) =>
        Promise.resolve(Object.fromEntries(keys.map((k) => [k, rawPage])))
    })
    await store.prefetch(['a', 'b'])
    await store.load('a')
    expect(fetchPermissions).not.toHaveBeenCalled()
  })

  it('never rejects when every request fails', async () => {
    const { store } = make({
      fetchPermissions: () => Promise.reject(new Error('x')),
      onError: () => undefined
    })
    await expect(store.prefetch(['a', 'b'])).resolves.toBeUndefined()
    expect(store.pages.get('a')?.fallback).toBe(true)
  })
})

describe('store.invalidate edge cases', () => {
  it('reloads when invalidating the current key explicitly', async () => {
    const { store, fetchPermissions } = make({ staleWhileRevalidate: false })
    store.current.value = 'users'
    await store.load('users')
    await store.invalidate('users')
    expect(fetchPermissions).toHaveBeenCalledTimes(2)
  })

  it('refetches an invalidated page on the next load', async () => {
    const { store, fetchPermissions } = make({ staleWhileRevalidate: false })
    await store.load('a')
    await store.invalidate('a')
    await store.load('a')
    expect(fetchPermissions).toHaveBeenCalledTimes(2)
  })

  it('does not fetch anything when invalidating without a current page', async () => {
    const { store, fetchPermissions } = make()
    await store.invalidate()
    expect(fetchPermissions).not.toHaveBeenCalled()
  })
})
