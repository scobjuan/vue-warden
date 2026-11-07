import { describe, expect, it } from 'vitest'

import { normalize } from '../../../src/core/normalize'
import {
  resolveComponent,
  resolveInput,
  splitKey
} from '../../../src/core/resolve'
import { rawPage } from '../../fixtures'

const page = normalize(rawPage, 'users')
const closed = normalize({ ...rawPage, can_access: false }, 'users')

describe('splitKey', () => {
  it('splits on the first dot', () => {
    expect(splitKey('new.save.now')).toEqual(['new', 'save.now'])
    expect(splitKey('new')).toEqual(['new', ''])
  })
})

describe('resolveComponent', () => {
  it('follows page and component access', () => {
    expect(resolveComponent(page, 'filter', 'deny')).toBe(true)
    expect(resolveComponent(page, 'billing', 'allow')).toBe(false)
    expect(resolveComponent(closed, 'filter', 'allow')).toBe(false)
  })

  it('applies the missing policy', () => {
    expect(resolveComponent(page, 'nope', 'deny')).toBe(false)
    expect(resolveComponent(page, 'nope', 'allow')).toBe(true)
    expect(resolveComponent(undefined, 'x', 'deny')).toBe(false)
    expect(resolveComponent(undefined, 'x', 'allow')).toBe(true)
  })
})

describe('resolveInput', () => {
  it('returns the input permission', () => {
    expect(resolveInput(page, 'filter', 'email', 'deny')).toEqual({
      view: true,
      edit: false
    })
  })

  it('denies everything under a closed page or component', () => {
    expect(resolveInput(closed, 'filter', 'username', 'allow').view).toBe(false)
    expect(resolveInput(page, 'billing', 'x', 'allow').view).toBe(false)
  })

  it('treats an empty input key as the component itself', () => {
    expect(resolveInput(page, 'filter', '', 'deny')).toEqual({
      view: true,
      edit: true
    })
  })

  it('applies the missing policy', () => {
    expect(resolveInput(page, 'filter', 'nope', 'deny').view).toBe(false)
    expect(resolveInput(page, 'filter', 'nope', 'allow').edit).toBe(true)
    expect(resolveInput(page, 'nope', 'x', 'allow').view).toBe(true)
    expect(resolveInput(undefined, 'x', 'y', 'deny').view).toBe(false)
  })
})

describe('resolve edge cases', () => {
  it('splitKey keeps an empty component or input intact', () => {
    expect(splitKey('')).toEqual(['', ''])
    expect(splitKey('a.')).toEqual(['a', ''])
    expect(splitKey('.b')).toEqual(['', 'b'])
  })

  it('denies a closed page regardless of the missing policy', () => {
    expect(resolveComponent(closed, 'unknown', 'allow')).toBe(false)
    expect(resolveInput(closed, 'unknown', 'x', 'allow')).toEqual({
      view: false,
      edit: false
    })
    expect(resolveInput(closed, 'filter', '', 'allow').view).toBe(false)
  })

  it('denies an empty input key of a denied component', () => {
    expect(resolveInput(page, 'billing', '', 'allow').view).toBe(false)
  })

  it('does not let the missing policy override an explicit deny', () => {
    expect(resolveInput(page, 'filter', 'password', 'allow')).toEqual({
      view: false,
      edit: false
    })
    expect(resolveComponent(page, 'billing', 'allow')).toBe(false)
  })

  it('returns frozen permissions that cannot be mutated', () => {
    const denied = resolveInput(undefined, 'x', 'y', 'deny')
    const allowed = resolveInput(undefined, 'x', 'y', 'allow')
    expect(Object.isFrozen(denied)).toBe(true)
    expect(Object.isFrozen(allowed)).toBe(true)
    expect(allowed).toEqual({ view: true, edit: true })
  })
})
