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
