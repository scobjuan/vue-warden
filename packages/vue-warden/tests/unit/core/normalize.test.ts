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

  it('only accepts the boolean true as a grant', () => {
    const page = normalize(
      {
        can_access: 'true',
        components: [
          {
            key: 'c',
            can_access: 1,
            inputs: [{ key: 'i', can_view: 'yes', can_edit: 1 }]
          }
        ]
      },
      'k'
    )
    expect(page.access).toBe(false)
    expect(page.components.get('c')?.access).toBe(false)
    expect(page.components.get('c')?.inputs.get('i')).toEqual({
      view: false,
      edit: false
    })
  })

  it('ignores can_edit when can_view is not strictly true', () => {
    const page = normalize(
      {
        can_access: true,
        components: [
          {
            key: 'c',
            can_access: true,
            inputs: [{ key: 'i', can_view: false, can_edit: true }]
          }
        ]
      },
      'k'
    )
    expect(page.components.get('c')?.inputs.get('i')?.edit).toBe(false)
  })

  it('ignores non-array component and input lists', () => {
    const page = normalize({ can_access: true, components: { key: 'c' } }, 'k')
    expect(page.components.size).toBe(0)
    const withBadInputs = normalize(
      {
        can_access: true,
        components: [{ key: 'c', can_access: true, inputs: 'nope' }]
      },
      'k'
    )
    expect(withBadInputs.components.get('c')?.inputs.size).toBe(0)
  })

  it('lets the last duplicate key win', () => {
    const page = normalize(
      {
        can_access: true,
        components: [
          { key: 'c', can_access: false, inputs: [] },
          { key: 'c', can_access: true, inputs: [] }
        ]
      },
      'k'
    )
    expect(page.components.size).toBe(1)
    expect(page.components.get('c')?.access).toBe(true)
  })

  it('freezes the page, its components and its inputs', () => {
    const page = normalize(rawPage, 'x')
    const filter = page.components.get('filter')
    expect(Object.isFrozen(page)).toBe(true)
    expect(Object.isFrozen(filter)).toBe(true)
    expect(Object.isFrozen(filter?.inputs.get('email'))).toBe(true)
  })

  it('does not alias the raw payload', () => {
    const raw = structuredClone(rawPage)
    const page = normalize(raw, 'x')
    raw.components[0]!.can_access = false
    expect(page.components.get('filter')?.access).toBe(true)
  })

  it('denies access when the payload has no can_access', () => {
    expect(normalize({}, 'k').access).toBe(false)
  })

  it('shares one frozen empty map between fallback pages', () => {
    expect(fallbackPage('a', true).components).toBe(
      fallbackPage('b', false).components
    )
    expect(Object.isFrozen(fallbackPage('a', true))).toBe(true)
  })
})
