import {
  type Directive,
  effectScope,
  type ShallowRef,
  shallowRef,
  watchEffect
} from 'vue'

import { resolveInput, splitKey } from '../core/resolve'
import type { WardenInstance } from '../plugin'

interface State {
  value: ShallowRef<string>
  scope: ReturnType<typeof effectScope>
  hidden: boolean
  disabled: boolean
  nativeDisabled: boolean
  display: [string, string]
}

const CONTEXT_SELECTOR = '[data-warden-component]'

/**
 * Builds the `v-warden` directive bound to one Warden instance.
 * Hides the element when the input is not viewable and disables it when it is
 * not editable. The value is `'input'` inside `<Warden>` or `'component.input'`.
 * @param warden - Instance whose store is read.
 * @returns The directive definition.
 */
export function createDirective(
  warden: WardenInstance
): Directive<HTMLElement, string> {
  const { store, options } = warden
  const states = new WeakMap<HTMLElement, State>()

  function apply(el: HTMLElement, state: State): void {
    const context = el.closest<HTMLElement>(CONTEXT_SELECTOR)
    const path = state.value.value
    const [component, input]: [string, string] = context
      ? [context.dataset.wardenComponent ?? '', path]
      : splitKey(path)
    const route = context?.dataset.wardenRoute
    const key = route ?? store.current.value
    const page = key === undefined ? undefined : store.pages.get(key)
    const permission = resolveInput(page, component, input, options.onMissing)

    setHidden(el, state, !permission.view)
    setDisabled(el, state, permission.view && !permission.edit)
  }

  function setHidden(el: HTMLElement, state: State, hide: boolean): void {
    if (hide === state.hidden) return
    state.hidden = hide
    if (hide) {
      state.display = [
        el.style.getPropertyValue('display'),
        el.style.getPropertyPriority('display')
      ]
      el.style.setProperty('display', 'none', 'important')
      el.setAttribute('aria-hidden', 'true')
    } else {
      el.style.removeProperty('display')
      if (state.display[0]) {
        el.style.setProperty('display', state.display[0], state.display[1])
      }
      el.removeAttribute('aria-hidden')
    }
  }

  function setDisabled(el: HTMLElement, state: State, disable: boolean): void {
    if (disable === state.disabled) return
    state.disabled = disable
    const native = 'disabled' in el
    if (disable) {
      if (native) {
        state.nativeDisabled = (el as HTMLInputElement).disabled
        ;(el as HTMLInputElement).disabled = true
      }
      el.setAttribute('aria-disabled', 'true')
      el.setAttribute('inert', '')
      el.classList.add(options.disabledClass)
    } else {
      if (native) (el as HTMLInputElement).disabled = state.nativeDisabled
      el.removeAttribute('aria-disabled')
      el.removeAttribute('inert')
      el.classList.remove(options.disabledClass)
    }
  }

  return {
    mounted(el, binding) {
      const scope = effectScope(true)
      const state: State = {
        value: shallowRef(binding.value),
        scope,
        hidden: false,
        disabled: false,
        nativeDisabled: false,
        display: ['', '']
      }
      states.set(el, state)
      scope.run(() => {
        watchEffect(() => {
          apply(el, state)
        })
      })
    },
    updated(el, binding) {
      const state = states.get(el)
      if (state) state.value.value = binding.value
    },
    unmounted(el) {
      states.get(el)?.scope.stop()
      states.delete(el)
    }
  }
}
