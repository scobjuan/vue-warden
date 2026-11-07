import { defineComponent } from 'vue'

import { pageFor, useWardenInstance } from '../context'
import { deniedContext } from '../core/messages'
import { renderDenied } from './denied'

/**
 * Wrap `<RouterView>` with it to render the denied UI in place when the
 * current page is denied and no `forbiddenRoute` redirect is configured.
 */
export const WardenGate = defineComponent({
  name: 'WardenGate',
  setup(_, { slots }) {
    const warden = useWardenInstance()

    return () => {
      const page = pageFor(warden.store)
      if (page && !page.access) {
        return renderDenied(
          warden,
          slots.denied,
          deniedContext('page', page.key)
        )
      }
      return slots.default?.()
    }
  }
})
