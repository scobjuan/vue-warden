import { defineComponent, h, type PropType } from 'vue'

import type { DeniedKind } from '../core/types'

/** Default accessible "access denied" alert. Theme it with CSS variables. */
export const WardenDenied = defineComponent({
  name: 'WardenDenied',
  props: {
    kind: { type: String as PropType<DeniedKind>, required: true },
    target: { type: String, required: true },
    message: { type: String, required: true }
  },
  setup(props) {
    return () =>
      h(
        'div',
        {
          class: 'warden-denied',
          role: 'status',
          'data-warden-kind': props.kind,
          'data-warden-target': props.target
        },
        [h('p', { class: 'warden-denied__message' }, props.message)]
      )
  }
})
