import { describe, expect, it } from 'vitest'

import { fallbackPage, normalize } from '../../../src/core/normalize'
import { rawPage } from '../../fixtures'

describe('normalize', () => {
  it('builds Maps following the official contract', () => {
    const page = normalize(rawPage, 'x')
    expect(page.key).toBe('users')
    expect(page.access).toBe(true)
    expect(page.components.get('filter')?.inputs.get('email')).toEqual({
      view: true,
      edit: false
    })
    expect(page.components.get('billing')?.access).toBe(false)
  })

  it('never grants edit without view', () => {
    const page = normalize(rawPage, 'x')
    expect(page.components.get('filter')?.inputs.get('password')).toEqual({
      view: false,
      edit: false
    })
  })

  it('uses the fallback key and skips malformed entries', () => {
    const page = normalize(
      {
        can_access: true,
        components: [
          null,
          { key: 3 },
          { key: 'c', inputs: [{}, 'x', { key: 'i' }] }
        ]
      },
      'fallback'
    )
    expect(page.key).toBe('fallback')
    expect(page.components.size).toBe(1)
    expect(page.components.get('c')?.access).toBe(false)
    expect(page.components.get('c')?.inputs.get('i')).toEqual({
      view: false,
      edit: false
    })
  })

  it('tolerates missing lists', () => {
    expect(normalize({ can_access: true }, 'k').components.size).toBe(0)
  })

  it('throws on non-object payloads', () => {
    expect(() => normalize(null, 'k')).toThrow(TypeError)
    expect(() => normalize('nope', 'k')).toThrow(TypeError)
  })

  it('builds fallback pages', () => {
    expect(fallbackPage('k', false)).toMatchObject({
      access: false,
      fallback: true
    })
    expect(fallbackPage('k', true).access).toBe(true)
  })
})
