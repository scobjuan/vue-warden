import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import { rawPage } from '../../fixtures'
import { mountWith, readyWarden } from '../../helpers'

const body = (key: string, extra: Record<string, unknown> = {}) =>
  defineComponent({
    template: `<Warden component-key="${key}" v-bind="extra"><p id="ok">secret</p><template #denied="{ target, kind }"><i id="slot">{{ kind }}:{{ target }}</i></template></Warden>`,
    data: () => ({ extra })
  })

describe('<Warden>', () => {
  it('renders the slot when the component is accessible', async () => {
    const wrapper = mountWith(await readyWarden(), body('filter'))
    expect(wrapper.find('#ok').exists()).toBe(true)
    expect(wrapper.find('[data-warden-component="filter"]').exists()).toBe(true)
  })

  it('renders the #denied slot and notifies onDenied', async () => {
    const onDenied = vi.fn()
    const wrapper = mountWith(await readyWarden({ onDenied }), body('billing'))
    expect(wrapper.find('#ok').exists()).toBe(false)
    expect(wrapper.find('#slot').text()).toBe('component:billing')
    expect(onDenied).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'component', target: 'billing' })
    )
  })

  it('renders the built-in alert when there is no slot or global component', async () => {
    const Plain = defineComponent({
      template: '<Warden component-key="billing"><p>x</p></Warden>'
    })
    const wrapper = mountWith(await readyWarden(), Plain)
    expect(wrapper.find('.warden-denied').attributes('role')).toBe('status')
  })

  it('renders the global deniedComponent with kind, target and message', async () => {
    const Denied = defineComponent({
      props: ['kind', 'target', 'message'],
      setup: (p) => () =>
        h('b', { id: 'global' }, `${p.kind}|${p.target}|${p.message}`)
    })
    const Plain = defineComponent({
      template: '<Warden component-key="billing"><p>x</p></Warden>'
    })
    const wrapper = mountWith(
      await readyWarden({ deniedComponent: Denied }),
      Plain
    )
    expect(wrapper.find('#global').text()).toContain('component|billing|')
  })

  it('renders nothing when silent', async () => {
    const wrapper = mountWith(
      await readyWarden(),
      body('billing', { silent: true })
    )
    expect(wrapper.find('#slot').exists()).toBe(false)
    expect(wrapper.find('.warden-denied').exists()).toBe(false)
  })

  it('applies the missing policy to unknown components', async () => {
    const deny = mountWith(await readyWarden(), body('unknown'))
    expect(deny.find('#ok').exists()).toBe(false)
    const allow = mountWith(
      await readyWarden({ onMissing: 'allow' }),
      body('unknown')
    )
    expect(allow.find('#ok').exists()).toBe(true)
  })

  it('loads an explicit route on demand and waits for it', async () => {
    const wrapper = mountWith(
      await readyWarden(),
      defineComponent({
        template:
          '<Warden component-key="filter" route="other"><p id="ok">x</p></Warden>'
      })
    )
    expect(wrapper.find('#ok').exists()).toBe(false)
    expect(wrapper.find('.warden-denied').exists()).toBe(false)
    await flushPromises()
    expect(wrapper.find('#ok').exists()).toBe(true)
  })

  it('reacts when permissions change', async () => {
    const warden = await readyWarden({ ttl: 0, staleWhileRevalidate: false })
    const wrapper = mountWith(warden, body('filter'))
    expect(wrapper.find('#ok').exists()).toBe(true)
    warden.store.pages.set(
      'users',
      Object.freeze({ ...warden.store.pages.get('users')!, access: false })
    )
    await flushPromises()
    expect(wrapper.find('#ok').exists()).toBe(false)
  })

  it('reports a stable page for the sample payload', () => {
    expect(rawPage.components).toHaveLength(2)
  })
})
