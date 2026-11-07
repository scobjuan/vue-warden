import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import { Warden } from '../../../src/components/warden'
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

  it('does not notify onDenied or render the slot when allowed', async () => {
    const onDenied = vi.fn()
    const wrapper = mountWith(await readyWarden({ onDenied }), body('filter'))
    expect(onDenied).not.toHaveBeenCalled()
    expect(wrapper.find('#slot').exists()).toBe(false)
  })

  it('notifies onDenied once per denial, not on every render', async () => {
    const onDenied = vi.fn()
    const warden = await readyWarden({ onDenied })
    mountWith(warden, body('billing'))
    warden.store.pages.set('unrelated', warden.store.pages.get('users')!)
    await flushPromises()
    expect(onDenied).toHaveBeenCalledTimes(1)
  })

  it('does not notify onDenied while an explicit route is loading', async () => {
    const onDenied = vi.fn()
    mountWith(
      await readyWarden({ onDenied }),
      defineComponent({
        template: '<Warden component-key="filter" route="other"><p /></Warden>'
      })
    )
    await flushPromises()
    expect(onDenied).not.toHaveBeenCalled()
  })

  it('notifies onDenied and swaps the UI when access is revoked later', async () => {
    const onDenied = vi.fn()
    const warden = await readyWarden({ onDenied })
    const wrapper = mountWith(warden, body('filter'))
    warden.store.pages.set(
      'users',
      Object.freeze({
        ...warden.store.pages.get('users')!,
        components: new Map([['filter', { access: false, inputs: new Map() }]])
      })
    )
    await flushPromises()
    expect(wrapper.find('#ok').exists()).toBe(false)
    expect(wrapper.find('#slot').text()).toBe('component:filter')
    expect(onDenied).toHaveBeenCalledOnce()
  })

  it('shows the content again when access is granted later', async () => {
    const warden = await readyWarden()
    const wrapper = mountWith(warden, body('billing'))
    expect(wrapper.find('#ok').exists()).toBe(false)
    warden.store.pages.set(
      'users',
      Object.freeze({
        ...warden.store.pages.get('users')!,
        components: new Map([['billing', { access: true, inputs: new Map() }]])
      })
    )
    await flushPromises()
    expect(wrapper.find('#ok').exists()).toBe(true)
    expect(wrapper.find('#slot').exists()).toBe(false)
  })

  it('prefers the #denied slot over the global deniedComponent', async () => {
    const Global = defineComponent({ render: () => h('b', { id: 'global' }) })
    const wrapper = mountWith(
      await readyWarden({ deniedComponent: Global }),
      body('billing')
    )
    expect(wrapper.find('#slot').exists()).toBe(true)
    expect(wrapper.find('#global').exists()).toBe(false)
  })

  it('denies every component when the page itself is denied', async () => {
    const wrapper = mountWith(
      await readyWarden(
        { onMissing: 'allow' },
        { key: 'users', can_access: false, components: [] }
      ),
      body('filter')
    )
    expect(wrapper.find('#ok').exists()).toBe(false)
  })

  it('renders the wrapper with the requested tag and route attributes', async () => {
    const wrapper = mountWith(
      await readyWarden(),
      defineComponent({
        template:
          '<Warden component-key="filter" route="users" as="section"><p /></Warden>'
      })
    )
    await flushPromises()
    const el = wrapper.find('section')
    expect(el.attributes('data-warden-component')).toBe('filter')
    expect(el.attributes('data-warden-route')).toBe('users')
    expect(el.attributes('style')).toContain('display: contents')
  })

  it('keeps the wrapper in the DOM when denied and silent', async () => {
    const wrapper = mountWith(
      await readyWarden(),
      body('billing', { silent: true })
    )
    const el = wrapper.find('[data-warden-component="billing"]')
    expect(el.exists()).toBe(true)
    expect(el.element.children).toHaveLength(0)
  })

  it('fails closed with a clear error when the plugin is missing', () => {
    expect(() =>
      mount(
        defineComponent({
          template: '<Warden component-key="x" />'
        }),
        { global: { components: { Warden } } }
      )
    ).toThrow(/install the plugin/)
  })
})
