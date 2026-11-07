import type { ResolvedOptions, WardenOptions } from './types'

/**
 * Applies defaults to user options and validates the required ones.
 * @param options - User options.
 * @returns Options with defaults applied.
 * @throws {TypeError} When `fetchPermissions` is not a function.
 */
export function resolveOptions(options: WardenOptions): ResolvedOptions {
  if (typeof options.fetchPermissions !== 'function') {
    throw new TypeError('vue-warden: `fetchPermissions` must be a function')
  }
  return {
    ...options,
    ttl: options.ttl ?? 60_000,
    staleWhileRevalidate: options.staleWhileRevalidate ?? true,
    timeout: options.timeout ?? 10_000,
    onMissing: options.onMissing ?? 'deny',
    protect: options.protect ?? 'all',
    disabledClass: options.disabledClass ?? 'warden-disabled'
  }
}
