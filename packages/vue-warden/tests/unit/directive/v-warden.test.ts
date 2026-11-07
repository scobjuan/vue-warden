import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'

import { mountWith, readyWarden } from '../../helpers'

const Form = defineComponent({
  template: `<Warden component-key="filter">
    <input id="u" v-warden="'username'" />
    <input id="e" v-warden="'email'" />
    <input id="p" v-warden="'password'" />
    <button id="x" v-warden="'filter.email'" disabled>x</button>
  </Warden>`
})

describe('v-warden', () => {
  it('leaves fully permitted elements untouched', async () => {
    const wrapper = mountWith(await readyWarden(), Form)
    const el = wrapper.find('#u').element as HTMLInputElement
    expect(el.disabled).toBe(false)
    expect(el.getAttribute('aria-disabled')).toBeNull()
    expect(el.style.display).toBe('')
  })

  it('disables read-only elements', async () => {
    const wrapper = mountWith(await readyWarden(), Form)
    const el = wrapper.find('#e').element as HTMLInputElement
    expect(el.disabled).toBe(true)
    expect(el.getAttribute('aria-disabled')).toBe('true')
    expect(el.hasAttribute('inert')).toBe(true)
    expect(el.classList.contains('warden-disabled')).toBe(true)
  })

  it('hides elements that cannot be viewed', async () => {
    const wrapper = mountWith(await readyWarden(), Form)
    const el = wrapper.find('#p').element as HTMLElement
    expect(el.style.getPropertyValue('display')).toBe('none')
    expect(el.getAttribute('aria-hidden')).toBe('true')
  })

  it('keeps an originally disabled native element disabled when permitted again', async () => {
    const warden = await readyWarden()
    const wrapper = mountWith(warden, Form)
    const el = wrapper.find('#x').element as HTMLButtonElement
    expect(el.disabled).toBe(true)
    warden.store.pages.set(
      'users',
      Object.freeze({
        ...warden.store.pages.get('users')!,
        components: new Map([
          [
            'filter',
            {
              access: true,
              inputs: new Map([['email', { view: true, edit: true }]])
            }
          ]
        ])
      })
    )
    await flushPromises()
    expect(el.disabled).toBe(true)
    expect(el.hasAttribute('inert')).toBe(false)
    expect(el.classList.contains('warden-disabled')).toBe(false)
  })

  it('restores hidden elements and previous inline display when permitted', async () => {
    const warden = await readyWarden()
    const wrapper = mountWith(
      warden,
      defineComponent({
        template:
          '<Warden component-key="filter"><i id="p" style="display: flex" v-warden="\'password\'" /></Warden>'
      })
    )
    const el = wrapper.find('#p').element as HTMLElement
    expect(el.style.getPropertyValue('display')).toBe('none')
    warden.store.pages.set(
      'users',
      Object.freeze({
        ...warden.store.pages.get('users')!,
        components: new Map([
          [
            'filter',
            {
              access: true,
              inputs: new Map([['password', { view: true, edit: true }]])
            }
          ]
        ])
      })
    )
    await flushPromises()
    expect(el.style.getPropertyValue('display')).toBe('flex')
    expect(el.hasAttribute('aria-hidden')).toBe(false)
  })

  it('works with a full component.input path outside <Warden>', async () => {
    const wrapper = mountWith(
      await readyWarden(),
      defineComponent({
        template:
          '<div><input id="a" v-warden="\'filter.password\'" /><input id="b" v-warden="\'filter.username\'" /></div>'
      })
    )
    expect((wrapper.find('#a').element as HTMLElement).style.display).toBe(
      'none'
    )
    expect((wrapper.find('#b').element as HTMLElement).style.display).toBe('')
  })

  it('follows binding value changes', async () => {
    const wrapper = mountWith(
      await readyWarden(),
      defineComponent({
        data: () => ({ key: 'filter.username' }),
        template: '<input id="a" v-warden="key" />'
      })
    )
    const el = wrapper.find('#a').element as HTMLElement
    expect(el.style.display).toBe('')
    await wrapper.setData({ key: 'filter.password' })
    expect(el.style.getPropertyValue('display')).toBe('none')
  })

  it('uses the explicit route of the surrounding <Warden>', async () => {
    const warden = await readyWarden()
    const wrapper = mountWith(
      warden,
      defineComponent({
        template:
          '<Warden component-key="filter" route="users"><input id="a" v-warden="\'password\'" /></Warden>'
      })
    )
    await flushPromises()
    expect(
      (wrapper.find('#a').element as HTMLElement).style.getPropertyValue(
        'display'
      )
    ).toBe('none')
  })

  it('cleans up on unmount', async () => {
    const wrapper = mountWith(await readyWarden(), Form)
    expect(() => {
      wrapper.unmount()
    }).not.toThrow()
  })
})
