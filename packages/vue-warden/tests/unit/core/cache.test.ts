import { describe, expect, it, vi } from 'vitest'

import { createCache } from '../../../src/core/cache'
import { fallbackPage } from '../../../src/core/normalize'

const page = fallbackPage('a', true)

describe('createCache', () => {
  it('dedupes concurrent requests', async () => {
    const load = vi.fn(() => Promise.resolve(page))
    const cache = createCache(100, load)
    const [a, b] = await Promise.all([cache.request('a'), cache.request('a')])
    expect(a).toBe(b)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('reports freshness according to the ttl', async () => {
    let time = 0
    const cache = createCache(
      100,
      () => Promise.resolve(page),
      () => time
    )
    await cache.request('a')
    expect(cache.peek('a')).toEqual({ page, fresh: true })
    time = 150
    expect(cache.peek('a')?.fresh).toBe(false)
    expect(cache.peek('zzz')).toBeUndefined()
  })

  it('invalidates one key or all keys keeping the data', async () => {
    const cache = createCache(1000, () => Promise.resolve(page))
    await cache.request('a')
    await cache.request('b')
    cache.invalidate('a')
    expect(cache.peek('a')?.fresh).toBe(false)
    expect(cache.peek('b')?.fresh).toBe(true)
    cache.invalidate()
    expect(cache.peek('b')?.fresh).toBe(false)
    cache.invalidate('missing')
  })

  it('allows retrying after a failure without caching the error', async () => {
    let fail = true
    const load = vi.fn(() =>
      fail ? Promise.reject(new Error('boom')) : Promise.resolve(page)
    )
    const cache = createCache(1000, load)
    await expect(cache.request('a')).rejects.toThrow('boom')
    expect(cache.peek('a')).toBeUndefined()
    fail = false
    await expect(cache.request('a')).resolves.toBe(page)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('keeps the previous page when a refresh fails', async () => {
    const newer = fallbackPage('a', false)
    const results = [Promise.resolve(page), Promise.reject(new Error('x'))]
    const cache = createCache(
      0,
      () => results.shift() ?? Promise.resolve(newer)
    )
    await cache.request('a')
    await expect(cache.request('a')).rejects.toThrow('x')
    expect(cache.peek('a')?.page).toBe(page)
  })

  it('serves the stale page while a refresh is in flight', async () => {
    let resolve!: (value: typeof page) => void
    const results = [
      Promise.resolve(page),
      new Promise<typeof page>((r) => {
        resolve = r
      })
    ]
    const cache = createCache(0, () => results.shift() ?? Promise.resolve(page))
    await cache.request('a')
    const refresh = cache.request('a')
    expect(cache.peek('a')?.page).toBe(page)
    const newer = fallbackPage('a', false)
    resolve(newer)
    await refresh
    expect(cache.peek('a')?.page).toBe(newer)
  })

  it('loads again once the previous request settled', async () => {
    const load = vi.fn(() => Promise.resolve(page))
    const cache = createCache(1000, load)
    await cache.request('a')
    await cache.request('a')
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('does not share requests between different keys', async () => {
    const load = vi.fn(() => Promise.resolve(page))
    const cache = createCache(1000, load)
    await Promise.all([cache.request('a'), cache.request('b')])
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('treats the entry as stale exactly at the ttl boundary', () => {
    let time = 0
    const cache = createCache(
      100,
      () => Promise.resolve(page),
      () => time
    )
    cache.set('a', page)
    time = 99
    expect(cache.peek('a')?.fresh).toBe(true)
    time = 100
    expect(cache.peek('a')?.fresh).toBe(false)
  })

  it('clears everything', async () => {
    const cache = createCache(1000, () => Promise.resolve(page))
    await cache.request('a')
    cache.clear()
    expect(cache.peek('a')).toBeUndefined()
  })
})
