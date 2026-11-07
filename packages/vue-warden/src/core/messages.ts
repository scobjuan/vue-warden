import type { DeniedContext, DeniedKind } from './types'

/**
 * Builds the denied context handed to hooks and to the denied UI.
 * @param kind - What was denied.
 * @param key - Page, component or `component.input` key.
 * @returns The denied context with a default message.
 */
export function deniedContext(kind: DeniedKind, key: string): DeniedContext {
  return {
    kind,
    target: key,
    message: `You do not have permission to access this ${kind}.`
  }
}
