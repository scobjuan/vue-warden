import { computed, defineComponent, h, provide, watch } from 'vue'

import { COMPONENT_KEY, pageFor, useWardenInstance } from '../context'
import { deniedContext } from '../core/messages'
import { resolveComponent } from '../core/resolve'
import { renderDenied } from './denied'

/**
 * Guards a section of the UI. Renders its default slot when the component is
 * accessible; otherwise renders the denied UI (or nothing when `silent`).
 */
export const Warden = defineComponent({
  name: 'Warden',
  props: {
    componentKey: { type: String, required: true },
    route: { type: String, default: undefined },
    silent: { type: Boolean, default: false },
    as: { type: String, default: 'div' }
  },
  setup(props, { slots }) {
    const warden = useWardenInstance()
    const { store, options } = warden

    provide(COMPONENT_KEY, {
      get component() {
        return props.componentKey
      },
      get route() {
        return props.route
      }
    })

    if (props.route !== undefined && !store.pages.has(props.route)) {
      void store.load(props.route)
    }

    const state = computed(() => {
      const page = pageFor(store, props.route)
      if (props.route !== undefined && !page) return 'loading'
      return resolveComponent(page, props.componentKey, options.onMissing)
        ? 'allowed'
        : 'denied'
    })

    watch(
      state,
      (value) => {
        if (value === 'denied') {
          warden.deny(deniedContext('component', props.componentKey))
        }
      },
      { immediate: true }
    )

    return () => {
      const value = state.value
      let content
      if (value === 'allowed') {
        content = slots.default?.()
      } else if (value === 'denied' && !props.silent) {
        content = renderDenied(
          warden,
          slots.denied,
          deniedContext('component', props.componentKey)
        )
      }
      return h(
        props.as,
        {
          style: 'display: contents',
          'data-warden-component': props.componentKey,
          'data-warden-route': props.route
        },
        content
      )
    }
  }
})
