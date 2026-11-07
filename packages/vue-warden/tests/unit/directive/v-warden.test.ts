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

const Bare = defineComponent({
  template: '<input id="u" v-warden="\'filter.username\'" />'
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

  it('does not add the disabled attribute to non native elements', async () => {
    const wrapper = mountWith(
      await readyWarden(),
      defineComponent({
        template:
          '<Warden component-key="filter"><div id="d" v-warden="\'email\'" /></Warden>'
      })
    )
    const el = wrapper.find('#d').element
    expect(el.hasAttribute('disabled')).toBe(false)
    expect(el.getAttribute('aria-disabled')).toBe('true')
    expect(el.classList.contains('warden-disabled')).toBe(true)
  })

  it('uses the configured disabledClass', async () => {
    const wrapper = mountWith(await readyWarden({ disabledClass: 'ro' }), Form)
    expect(wrapper.find('#e').classes()).toContain('ro')
    expect(wrapper.find('#e').classes()).not.toContain('warden-disabled')
  })

  it('hides everything when no page is loaded (fail closed)', async () => {
    const warden = await readyWarden()
    warden.store.clear()
    const wrapper = mountWith(warden, Bare)
    expect((wrapper.find('#u').element as HTMLElement).style.display).toBe(
      'none'
    )
  })

  it('shows unknown inputs under the allow policy and hides them under deny', async () => {
    const template =
      '<Warden component-key="filter"><input id="a" v-warden="\'nope\'" /></Warden>'
    const deny = mountWith(await readyWarden(), defineComponent({ template }))
    expect((deny.find('#a').element as HTMLElement).style.display).toBe('none')
    const allow = mountWith(
      await readyWarden({ onMissing: 'allow' }),
      defineComponent({ template })
    )
    expect((allow.find('#a').element as HTMLElement).style.display).toBe('')
  })

  it('hides every element of a denied page', async () => {
    const wrapper = mountWith(
      await readyWarden(
        { onMissing: 'allow' },
        { key: 'users', can_access: false, components: [] }
      ),
      Bare
    )
    expect((wrapper.find('#u').element as HTMLElement).style.display).toBe(
      'none'
    )
  })

  it('reacts live when the page is revoked and restored', async () => {
    const warden = await readyWarden()
    const wrapper = mountWith(warden, Bare)
    const el = wrapper.find('#u').element as HTMLInputElement
    const original = warden.store.pages.get('users')!
    warden.store.pages.set(
      'users',
      Object.freeze({ ...original, access: false })
    )
    await flushPromises()
    expect(el.style.display).toBe('none')
    warden.store.pages.set('users', original)
    await flushPromises()
    expect(el.style.display).toBe('')
    expect(el.hasAttribute('aria-hidden')).toBe(false)
  })

  it('does not stack inert or aria attributes across repeated updates', async () => {
    const wrapper = mountWith(
      await readyWarden(),
      defineComponent({
        data: () => ({ n: 0 }),
        template:
          '<Warden component-key="filter"><input id="e" v-warden="\'email\'" :data-n="n" /></Warden>'
      })
    )
    await wrapper.setData({ n: 1 })
    await wrapper.setData({ n: 2 })
    const el = wrapper.find('#e').element as HTMLInputElement
    expect(el.disabled).toBe(true)
    expect(el.getAttribute('inert')).toBe('')
    expect(el.classList.length).toBe(1)
  })

  it('stops reacting after the element is unmounted', async () => {
    const warden = await readyWarden()
    const wrapper = mountWith(
      warden,
      defineComponent({
        data: () => ({ show: true }),
        template:
          '<Warden component-key="filter"><input v-if="show" id="p" v-warden="\'password\'" /></Warden>'
      })
    )
    const el = wrapper.find('#p').element as HTMLElement
    await wrapper.setData({ show: false })
    el.style.removeProperty('display')
    warden.store.pages.set(
      'users',
      Object.freeze({ ...warden.store.pages.get('users')!, access: false })
    )
    await flushPromises()
    expect(el.style.display).toBe('')
  })

  it('uses the context of the nearest <Warden> when nested', async () => {
    const wrapper = mountWith(
      await readyWarden(),
      defineComponent({
        template:
          '<Warden component-key="billing"><Warden component-key="filter" silent><input id="a" v-warden="\'username\'" /></Warden></Warden>'
      })
    )
    expect(wrapper.find('#a').exists()).toBe(false)
    const ok = mountWith(
      await readyWarden(),
      defineComponent({
        template:
          '<Warden component-key="filter"><Warden component-key="filter"><input id="a" v-warden="\'username\'" /></Warden></Warden>'
      })
    )
    expect((ok.find('#a').element as HTMLElement).style.display).toBe('')
  })

  it('preserves an important inline display when restoring', async () => {
    const warden = await readyWarden()
    const wrapper = mountWith(
      warden,
      defineComponent({
        template:
          '<Warden component-key="filter"><i id="p" style="display: flex !important" v-warden="\'password\'" /></Warden>'
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
    expect(el.style.getPropertyPriority('display')).toBe('important')
  })
})
