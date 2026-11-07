import { h, type Slot, type VNode } from 'vue'

import type { DeniedContext } from '../core/types'
import type { WardenInstance } from '../plugin'
import { WardenDenied } from './warden-denied'

/**
 * Renders the denied UI: per-instance slot, then the global component,
 * then the built-in default.
 * @param warden - Active instance.
 * @param slot - Optional `#denied` slot of the caller.
 * @param ctx - What was denied.
 * @returns The vnode(s) to render.
 */
export function renderDenied(
  warden: WardenInstance,
  slot: Slot | undefined,
  ctx: DeniedContext
): VNode | VNode[] {
  if (slot) return slot(ctx)
  return h(warden.options.deniedComponent ?? WardenDenied, { ...ctx })
}
