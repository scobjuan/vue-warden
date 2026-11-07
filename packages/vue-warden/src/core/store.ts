import { shallowReactive, shallowRef } from 'vue'

import { createCache } from './cache'
import { fallbackPage, normalize } from './normalize'
import { report } from './safe'
import type { FetchContext, PagePermission, ResolvedOptions } from './types'

export interface WardenStore {
  /** Reactive map of loaded pages. Reads are tracked per key. */
  readonly pages: Map<string, PagePermission>
  /** Key of the page currently displayed. */
  readonly current: { value: string | undefined }
  /** Resolves the permission of a page honoring cache, SWR and fallbacks. */
  load: (key: string) => Promise<PagePermission>
  /** Loads several pages, using the batch fetcher when available. */
  prefetch: (keys: string[]) => Promise<void>
  /** Marks cache entries stale; reloads the current page. */
  invalidate: (key?: string) => Promise<void>
  /** Drops everything. */
  clear: () => void
  /** Hook fired when a background refresh removes page access. */
  onRevoked: ((key: string) => void) | undefined
}

async function withTimeout<T>(
  run: (ctx: FetchContext) => Promise<T>,
  timeout: number
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
  }, timeout)
  try {
    const result = await Promise.race([
      run({ signal: controller.signal }),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('vue-warden: permissions request timed out'))
        })
      })
    ])
    return result
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Creates the reactive permission store of one app instance.
 * @param options - Resolved options.
 * @returns The store.
 */
export function createStore(options: ResolvedOptions): WardenStore {
  const pages = shallowReactive(new Map<string, PagePermission>())
  const current = shallowRef<string | undefined>(undefined)
  const allowFallback = options.onMissing === 'allow'

  const prepare = (raw: unknown, key: string): PagePermission =>
    normalize(options.transform ? options.transform(raw, key) : raw, key)

  const cache = createCache(options.ttl, async (key) =>
    prepare(
      await withTimeout(
        (ctx) => options.fetchPermissions(key, ctx),
        options.timeout
      ),
      key
    )
  )

  const store: WardenStore = {
    pages,
    current,
    onRevoked: undefined,
    load,
    prefetch,
    invalidate,
    clear
  }

  function publish(key: string, page: PagePermission): void {
    const previous = pages.get(key)
    pages.set(key, page)
    if (
      previous?.access &&
      !page.access &&
      current.value === key &&
      store.onRevoked
    ) {
      store.onRevoked(key)
    }
  }

  function revalidate(key: string): void {
    cache.request(key).then(
      (page) => {
        publish(key, page)
      },
      (error: unknown) => {
        report(error, options.onError)
      }
    )
  }

  async function load(key: string): Promise<PagePermission> {
    const hit = cache.peek(key)
    if (hit?.fresh) {
      if (!pages.has(key)) pages.set(key, hit.page)
      return hit.page
    }
    if (hit && options.staleWhileRevalidate) {
      pages.set(key, hit.page)
      revalidate(key)
      return hit.page
    }
    try {
      const page = await cache.request(key)
      publish(key, page)
      return page
    } catch (error) {
      report(error, options.onError)
      const page = hit?.page ?? fallbackPage(key, allowFallback)
      pages.set(key, page)
      return page
    }
  }

  async function prefetch(keys: string[]): Promise<void> {
    const missing = keys.filter((key) => !cache.peek(key)?.fresh)
    if (missing.length === 0) return

    const batch = options.fetchManyPermissions
    if (batch && missing.length > 1) {
      try {
        const result = await withTimeout(
          (ctx) => batch(missing, ctx),
          options.timeout
        )
        for (const key of missing) {
          if (key in result) {
            const page = prepare(result[key], key)
            cache.set(key, page)
            pages.set(key, page)
          }
        }
        return
      } catch (error) {
        report(error, options.onError)
      }
    }
    await Promise.all(missing.map((key) => load(key)))
  }

  async function invalidate(key?: string): Promise<void> {
    cache.invalidate(key)
    const target = key ?? current.value
    if (target !== undefined && (key === undefined || key === current.value)) {
      await load(target)
    }
  }

  function clear(): void {
    cache.clear()
    pages.clear()
    current.value = undefined
  }

  return store
}
