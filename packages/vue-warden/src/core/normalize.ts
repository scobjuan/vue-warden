import type {
  ComponentPermission,
  InputPermission,
  PagePermission
} from './types'

const EMPTY: ReadonlyMap<string, ComponentPermission> = new Map()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Converts a raw backend payload into frozen Maps for O(1) lookups.
 * Unknown or malformed entries are skipped instead of throwing.
 * @param raw - Payload following the official contract.
 * @param fallbackKey - Page key used when the payload has none.
 * @returns The normalized page permission.
 * @throws {TypeError} When the payload is not an object.
 */
export function normalize(raw: unknown, fallbackKey: string): PagePermission {
  if (!isRecord(raw)) throw new TypeError('Invalid permissions payload')

  const components = new Map<string, ComponentPermission>()
  const list = Array.isArray(raw.components)
    ? (raw.components as unknown[])
    : []

  for (const item of list) {
    if (!isRecord(item) || typeof item.key !== 'string') continue
    const inputs = new Map<string, InputPermission>()
    const inputList = Array.isArray(item.inputs)
      ? (item.inputs as unknown[])
      : []

    for (const input of inputList) {
      if (!isRecord(input) || typeof input.key !== 'string') continue
      const view = input.can_view === true
      inputs.set(
        input.key,
        Object.freeze({ view, edit: view && input.can_edit === true })
      )
    }

    components.set(
      item.key,
      Object.freeze({ access: item.can_access === true, inputs })
    )
  }

  return Object.freeze({
    key: typeof raw.key === 'string' ? raw.key : fallbackKey,
    access: raw.can_access === true,
    fallback: false,
    components
  })
}

/**
 * Builds the page used when loading failed.
 * @param key - Page key.
 * @param allow - Whether the fallback grants access.
 * @returns A fallback page permission.
 */
export function fallbackPage(key: string, allow: boolean): PagePermission {
  return Object.freeze({
    key,
    access: allow,
    fallback: true,
    components: EMPTY
  })
}
