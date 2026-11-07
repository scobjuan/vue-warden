import { computed, defineComponent, inject } from 'vue'

import { COMPONENT_KEY, pageFor, useWardenInstance } from '../context'
import { resolveInput, splitKey } from '../core/resolve'

/**
 * Renders its slot only when the input is viewable and hands the permission
 * flags to the slot so any UI library prop can be driven from them.
 */
export const WardenField = defineComponent({
  name: 'WardenField',
  props: {
    field: { type: String, required: true },
    component: { type: String, default: undefined }
  },
  setup(props, { slots }) {
    const { store, options } = useWardenInstance()
    const context = inject(COMPONENT_KEY, undefined)

    const permission = computed(() => {
      const explicit = props.component ?? context?.component
      const [component, input] =
        explicit === undefined ? splitKey(props.field) : [explicit, props.field]
      return resolveInput(
        pageFor(store, context?.route),
        component,
        input,
        options.onMissing
      )
    })

    return () => {
      const { view, edit } = permission.value
      return view
        ? slots.default?.({ canView: view, canEdit: edit })
        : undefined
    }
  }
})
