import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'

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
