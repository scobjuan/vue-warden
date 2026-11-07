import type { InputPermission, MissingPolicy, PagePermission } from './types'

const DENY: InputPermission = Object.freeze({ view: false, edit: false })
const ALLOW: InputPermission = Object.freeze({ view: true, edit: true })

/**
 * Splits `component.input` on the first dot.
 * @param path - Full key, e.g. `new-user.save`.
 * @returns The component key and the input key (empty when absent).
 */
export function splitKey(path: string): [string, string] {
  const index = path.indexOf('.')
  return index === -1
    ? [path, '']
    : [path.slice(0, index), path.slice(index + 1)]
}

/**
 * Decides whether a component is accessible.
 * @param page - Current page permission, if loaded.
 * @param componentKey - Component key.
 * @param missing - Policy for unknown keys.
 * @returns True when the component may be rendered.
 */
export function resolveComponent(
  page: PagePermission | undefined,
  componentKey: string,
  missing: MissingPolicy
): boolean {
  if (!page) return missing === 'allow'
  if (!page.access) return false
  const component = page.components.get(componentKey)
  return component ? component.access : missing === 'allow'
}

/**
 * Decides view and edit rights of an input.
 * @param page - Current page permission, if loaded.
 * @param componentKey - Component key.
 * @param inputKey - Input key. Empty means the component itself.
 * @param missing - Policy for unknown keys.
 * @returns A frozen permission object.
 */
export function resolveInput(
  page: PagePermission | undefined,
  componentKey: string,
  inputKey: string,
  missing: MissingPolicy
): InputPermission {
  const fallback = missing === 'allow' ? ALLOW : DENY
  if (!page) return fallback
  if (!page.access) return DENY
  const component = page.components.get(componentKey)
  if (!component) return fallback
  if (!component.access) return DENY
  if (inputKey === '') return ALLOW
  return component.inputs.get(inputKey) ?? fallback
}
