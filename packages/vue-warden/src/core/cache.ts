import type { PagePermission } from './types'

interface Entry {
  page?: PagePermission
  at: number
  pending?: Promise<PagePermission>
}

export interface Cache {
  /** Returns the cached page and whether it is still fresh. */
  peek: (key: string) => { page: PagePermission; fresh: boolean } | undefined
  /** Loads a page, deduplicating concurrent requests for the same key. */
  request: (key: string) => Promise<PagePermission>
  /** Stores a page as fresh. */
  set: (key: string, page: PagePermission) => void
  /** Marks one key (or all) as stale without dropping the data. */
  invalidate: (key?: string) => void
  /** Drops every entry. */
  clear: () => void
}

/**
 * Creates the per-route cache with TTL and in-flight deduplication.
 * @param ttl - Milliseconds a page stays fresh.
 * @param load - Loader that fetches and normalizes one page.
 * @param now - Clock, injectable for tests.
 * @returns The cache.
 */
export function createCache(
  ttl: number,
  load: (key: string) => Promise<PagePermission>,
  now: () => number = Date.now
): Cache {
  const entries = new Map<string, Entry>()

  function peek(
    key: string
  ): { page: PagePermission; fresh: boolean } | undefined {
    const entry = entries.get(key)
    if (!entry?.page) return undefined
    return { page: entry.page, fresh: now() - entry.at < ttl }
  }

  function set(key: string, page: PagePermission): void {
    entries.set(key, { page, at: now() })
  }

  function request(key: string): Promise<PagePermission> {
    const current = entries.get(key)
    if (current?.pending) return current.pending

    const pending = load(key).then(
      (page) => {
        set(key, page)
        return page
      },
      (error: unknown) => {
        const entry = entries.get(key)
        if (entry) delete entry.pending
        throw error
      }
    )
    entries.set(key, { ...current, at: current?.at ?? 0, pending })
    return pending
  }

  function invalidate(key?: string): void {
    if (key === undefined) {
      for (const entry of entries.values()) entry.at = 0
      return
    }
    const entry = entries.get(key)
    if (entry) entry.at = 0
  }

  return {
    peek,
    request,
    set,
    invalidate,
    clear: () => {
      entries.clear()
    }
  }
}
