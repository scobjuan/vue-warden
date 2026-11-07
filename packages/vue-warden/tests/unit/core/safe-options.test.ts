import { describe, expect, it, vi } from 'vitest'

import { resolveOptions } from '../../../src/core/options'
import { report, safe } from '../../../src/core/safe'

describe('safe', () => {
  it('returns the result when nothing throws', () => {
    expect(safe(() => 1, undefined, 0)).toBe(1)
  })

  it('returns the fallback and reports errors', () => {
    const onError = vi.fn()
    expect(
      safe(
        () => {
          throw new Error('x')
        },
        onError,
        'fb'
      )
    ).toBe('fb')
    expect(onError).toHaveBeenCalledOnce()
  })

  it('swallows errors thrown by the reporter', () => {
    expect(() => {
      report(new Error('a'), () => {
        throw new Error('b')
      })
    }).not.toThrow()
    expect(() => {
      report(new Error('a'), undefined)
    }).not.toThrow()
  })
})

describe('resolveOptions', () => {
  it('applies defaults', () => {
    const options = resolveOptions({
      fetchPermissions: () => Promise.resolve({})
    })
    expect(options).toMatchObject({
      ttl: 60_000,
      staleWhileRevalidate: true,
      timeout: 10_000,
      onMissing: 'deny',
      protect: 'all',
      disabledClass: 'warden-disabled'
    })
  })

  it('keeps user values', () => {
    const options = resolveOptions({
      fetchPermissions: () => Promise.resolve({}),
      ttl: 5,
      onMissing: 'allow'
    })
    expect(options.ttl).toBe(5)
    expect(options.onMissing).toBe('allow')
  })

  it('requires a fetcher', () => {
    expect(() => resolveOptions({} as never)).toThrow(TypeError)
  })
})
