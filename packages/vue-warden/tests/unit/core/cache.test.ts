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

  it('allows retrying after a failure and keeps previous data', async () => {
    let fail = true
    const cache = createCache(1000, () =>
      fail ? Promise.reject(new Error('boom')) : Promise.resolve(page)
    )
    await expect(cache.request('a')).rejects.toThrow('boom')
    fail = false
    await expect(cache.request('a')).resolves.toBe(page)
  })

  it('clears everything', async () => {
    const cache = createCache(1000, () => Promise.resolve(page))
    await cache.request('a')
    cache.clear()
    expect(cache.peek('a')).toBeUndefined()
  })
})
