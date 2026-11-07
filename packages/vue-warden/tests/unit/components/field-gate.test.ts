import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'

import { WardenDenied } from '../../../src/components/warden-denied'
import { mountWith, readyWarden } from '../../helpers'

describe('<WardenField>', () => {
  const Form = defineComponent({
    template: `<Warden component-key="filter">
      <WardenField field="username" v-slot="{ canEdit }"><input id="u" :disabled="!canEdit" /></WardenField>
      <WardenField field="email" v-slot="{ canEdit }"><input id="e" :disabled="!canEdit" /></WardenField>
      <WardenField field="password"><input id="p" /></WardenField>
      <WardenField field="missing"><input id="m" /></WardenField>
    </Warden>`
  })

  it('renders viewable fields and exposes edit flags', async () => {
    const wrapper = mountWith(await readyWarden(), Form)
    expect(wrapper.find('#u').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('#e').attributes('disabled')).toBeDefined()
  })

  it('hides non viewable and unknown fields', async () => {
    const wrapper = mountWith(await readyWarden(), Form)
    expect(wrapper.find('#p').exists()).toBe(false)
    expect(wrapper.find('#m').exists()).toBe(false)
  })

  it('shows unknown fields under the allow policy', async () => {
    const wrapper = mountWith(await readyWarden({ onMissing: 'allow' }), Form)
    expect(wrapper.find('#m').exists()).toBe(true)
  })

  it('accepts a full component.input path without context', async () => {
    const wrapper = mountWith(
      await readyWarden(),
      defineComponent({
        template:
          '<div><WardenField field="filter.username"><i id="a" /></WardenField><WardenField field="filter.password"><i id="b" /></WardenField></div>'
      })
    )
    expect(wrapper.find('#a').exists()).toBe(true)
    expect(wrapper.find('#b').exists()).toBe(false)
  })

  it('accepts an explicit component prop', async () => {
    const wrapper = mountWith(
      await readyWarden(),
      defineComponent({
        template:
          '<WardenField field="username" component="filter"><i id="a" /></WardenField>'
      })
    )
    expect(wrapper.find('#a').exists()).toBe(true)
  })
})

describe('<WardenGate>', () => {
  const Page = defineComponent({
    template:
      '<WardenGate><main id="page">content</main><template #denied="{ target }"><i id="d">{{ target }}</i></template></WardenGate>'
  })

  it('renders the slot when the page is allowed', async () => {
    const wrapper = mountWith(await readyWarden(), Page)
    expect(wrapper.find('#page').exists()).toBe(true)
  })

  it('renders the denied UI in place when the page is denied', async () => {
    const wrapper = mountWith(
      await readyWarden(
        {},
        { key: 'users', can_access: false, components: [] }
      ),
      Page
    )
    expect(wrapper.find('#page').exists()).toBe(false)
    expect(wrapper.find('#d').text()).toBe('users')
  })

  it('falls back to the built-in alert and renders on public routes', async () => {
    const warden = await readyWarden(
      {},
      { key: 'users', can_access: false, components: [] }
    )
    const wrapper = mountWith(
      warden,
      defineComponent({
        template: '<WardenGate><main id="page" /></WardenGate>'
      })
    )
    expect(wrapper.find('.warden-denied').exists()).toBe(true)
    warden.store.current.value = undefined
    await flushPromises()
    expect(wrapper.find('#page').exists()).toBe(true)
  })
})

describe('<WardenField> edge cases', () => {
  it('exposes canView and canEdit flags to the slot', async () => {
    const wrapper = mountWith(
      await readyWarden(),
      defineComponent({
        template:
          '<Warden component-key="filter"><WardenField field="email" v-slot="{ canView, canEdit }"><i id="f">{{ canView }}|{{ canEdit }}</i></WardenField></Warden>'
      })
    )
    expect(wrapper.find('#f').text()).toBe('true|false')
  })

  it('renders nothing when there is no default slot', async () => {
    const wrapper = mountWith(
      await readyWarden(),
      defineComponent({
        template:
          '<Warden component-key="filter"><WardenField field="username" /></Warden>'
      })
    )
    expect(wrapper.find('[data-warden-component]').element.innerHTML).toBe(
      '<!---->'
    )
  })

  it('hides every field of a denied component', async () => {
    const wrapper = mountWith(
      await readyWarden({ onMissing: 'allow' }),
      defineComponent({
        template:
          '<WardenField field="billing.anything"><i id="a" /></WardenField>'
      })
    )
    expect(wrapper.find('#a').exists()).toBe(false)
  })

  it('reacts when permissions change', async () => {
    const warden = await readyWarden()
    const wrapper = mountWith(
      warden,
      defineComponent({
        template:
          '<WardenField field="filter.password"><i id="a" /></WardenField>'
      })
    )
    expect(wrapper.find('#a').exists()).toBe(false)
    warden.store.pages.set(
      'users',
      Object.freeze({
        ...warden.store.pages.get('users')!,
        components: new Map([
          [
            'filter',
            {
              access: true,
              inputs: new Map([['password', { view: true, edit: false }]])
            }
          ]
        ])
      })
    )
    await flushPromises()
    expect(wrapper.find('#a').exists()).toBe(true)
  })

  it('reads the route of the surrounding <Warden>', async () => {
    const wrapper = mountWith(
      await readyWarden(),
      defineComponent({
        template:
          '<Warden component-key="filter" route="users"><WardenField field="password"><i id="a" /></WardenField><WardenField field="username"><i id="b" /></WardenField></Warden>'
      })
    )
    await flushPromises()
    expect(wrapper.find('#a').exists()).toBe(false)
    expect(wrapper.find('#b').exists()).toBe(true)
  })

  it('fails closed before any page is loaded', async () => {
    const warden = await readyWarden()
    warden.store.clear()
    const wrapper = mountWith(
      warden,
      defineComponent({
        template:
          '<WardenField field="filter.username"><i id="a" /></WardenField>'
      })
    )
    expect(wrapper.find('#a').exists()).toBe(false)
  })
})

describe('<WardenGate> edge cases', () => {
  it('reacts when the current page becomes denied', async () => {
    const warden = await readyWarden()
    const wrapper = mountWith(
      warden,
      defineComponent({
        template:
          '<WardenGate><main id="page" /><template #denied><i id="d" /></template></WardenGate>'
      })
    )
    expect(wrapper.find('#page').exists()).toBe(true)
    warden.store.pages.set(
      'users',
      Object.freeze({ ...warden.store.pages.get('users')!, access: false })
    )
    await flushPromises()
    expect(wrapper.find('#page').exists()).toBe(false)
    expect(wrapper.find('#d').exists()).toBe(true)
  })

  it('renders the content while the current page is not loaded yet', async () => {
    const warden = await readyWarden()
    warden.store.pages.clear()
    const wrapper = mountWith(
      warden,
      defineComponent({
        template: '<WardenGate><main id="page" /></WardenGate>'
      })
    )
    expect(wrapper.find('#page').exists()).toBe(true)
  })

  it('uses the global deniedComponent when there is no slot', async () => {
    const Global = defineComponent({
      props: ['kind', 'target'],
      setup: (p) => () => h('b', { id: 'g' }, `${p.kind}:${p.target}`)
    })
    const wrapper = mountWith(
      await readyWarden(
        { deniedComponent: Global },
        { key: 'users', can_access: false, components: [] }
      ),
      defineComponent({ template: '<WardenGate><main /></WardenGate>' })
    )
    expect(wrapper.find('#g').text()).toBe('page:users')
  })
})

describe('<WardenDenied>', () => {
  it('renders an accessible status with the message and data attributes', () => {
    const wrapper = mount(WardenDenied, {
      props: { kind: 'input', target: 'a.b', message: 'Nope' }
    })
    const el = wrapper.find('.warden-denied')
    expect(el.attributes('role')).toBe('status')
    expect(el.attributes('data-warden-kind')).toBe('input')
    expect(el.attributes('data-warden-target')).toBe('a.b')
    expect(wrapper.find('.warden-denied__message').text()).toBe('Nope')
  })
})
