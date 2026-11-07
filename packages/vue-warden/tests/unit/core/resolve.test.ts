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
