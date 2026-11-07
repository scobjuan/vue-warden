import { describe, expect, it, vi } from 'vitest'

import { deniedContext } from '../../../src/core/messages'
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

  it('keeps falsy user values instead of applying defaults', () => {
    const options = resolveOptions({
      fetchPermissions: () => Promise.resolve({}),
      ttl: 0,
      timeout: 0,
      staleWhileRevalidate: false,
      disabledClass: 'ro',
      protect: 'marked'
    })
    expect(options).toMatchObject({
      ttl: 0,
      timeout: 0,
      staleWhileRevalidate: false,
      disabledClass: 'ro',
      protect: 'marked'
    })
  })

  it('preserves the other user options', () => {
    const onError = vi.fn()
    const options = resolveOptions({
      fetchPermissions: () => Promise.resolve({}),
      forbiddenRoute: 'nope',
      onError
    })
    expect(options.forbiddenRoute).toBe('nope')
    expect(options.onError).toBe(onError)
  })

  it('rejects a non-function fetcher', () => {
    expect(() => resolveOptions({ fetchPermissions: 'x' } as never)).toThrow(
      /fetchPermissions/
    )
  })
})

describe('safe edge cases', () => {
  it('reports non-Error throwables as they are', () => {
    const onError = vi.fn()
    safe(
      () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'plain'
      },
      onError,
      null
    )
    expect(onError).toHaveBeenCalledWith('plain')
  })

  it('returns the fallback even without a reporter', () => {
    expect(
      safe(
        () => {
          throw new Error('x')
        },
        undefined,
        'fb'
      )
    ).toBe('fb')
  })

  it('does not call the reporter when nothing throws', () => {
    const onError = vi.fn()
    safe(() => 1, onError, 0)
    expect(onError).not.toHaveBeenCalled()
  })
})

describe('deniedContext', () => {
  it('builds the context with the target and a message naming the kind', () => {
    expect(deniedContext('input', 'a.b')).toEqual({
      kind: 'input',
      target: 'a.b',
      message: 'You do not have permission to access this input.'
    })
    expect(deniedContext('page', 'users').message).toContain('page')
  })
})
