import type { Component } from 'vue'

/** Raw input permission as sent by the backend. */
export interface RawInputPermission {
  key: string
  can_view: boolean
  can_edit: boolean
}

/** Raw component permission as sent by the backend. */
export interface RawComponentPermission {
  key: string
  can_access: boolean
  inputs: RawInputPermission[]
}

/** Raw page permission as sent by the backend (official contract). */
export interface RawPagePermission {
  key: string
  can_access: boolean
  components: RawComponentPermission[]
}

/** Normalized permission of a single input. */
export interface InputPermission {
  readonly view: boolean
  readonly edit: boolean
}

/** Normalized permission of a component and its inputs. */
export interface ComponentPermission {
  readonly access: boolean
  readonly inputs: ReadonlyMap<string, InputPermission>
}

/** Normalized permission of a page and its components. */
export interface PagePermission {
  readonly key: string
  readonly access: boolean
  /** True when this page is a fallback created because loading failed. */
  readonly fallback: boolean
  readonly components: ReadonlyMap<string, ComponentPermission>
}

/** Why an element was denied. */
export type DeniedKind = 'page' | 'component' | 'input'

/** Information handed to `onDenied` and to the denied UI. */
export interface DeniedContext {
  kind: DeniedKind
  /** Page key, component key or `component.input` key. */
  target: string
  /** Human readable message. */
  message: string
}

/** Extra data passed to the user fetcher. */
export interface FetchContext {
  signal: AbortSignal
}

/** Policy applied when a key is missing or loading failed. */
export type MissingPolicy = 'deny' | 'allow'

/** Options accepted by `createWarden`. */
export interface WardenOptions {
  /** Returns the raw permissions of one page. Required. */
  fetchPermissions: (key: string, ctx: FetchContext) => Promise<unknown>
  /** Optional batch fetcher used by `prefetch` (returns a record by page key). */
  fetchManyPermissions?: (
    keys: string[],
    ctx: FetchContext
  ) => Promise<Record<string, unknown>>
  /** Adapts a backend response to the official contract. */
  transform?: (raw: unknown, key: string) => unknown
  /** Milliseconds a cached page stays fresh. Default 60000. */
  ttl?: number
  /** Serve stale cache instantly and revalidate in background. Default true. */
  staleWhileRevalidate?: boolean
  /** Fetch timeout in milliseconds. Default 10000. */
  timeout?: number
  /** Policy for missing keys and failed loads. Default 'deny'. */
  onMissing?: MissingPolicy
  /** Protect every route ('all') or only routes marked in meta ('marked'). */
  protect?: 'all' | 'marked'
  /** Route name or path to redirect to when a page is denied. */
  forbiddenRoute?: string
  /** Global component rendered when something is denied. */
  deniedComponent?: Component
  /** Called whenever something is denied. */
  onDenied?: (ctx: DeniedContext) => void
  /** Called when a user callback or a fetch fails. */
  onError?: (error: unknown) => void
  /** CSS class added to elements that are not editable. */
  disabledClass?: string
}

/** Options after defaults are applied. */
export interface ResolvedOptions extends WardenOptions {
  ttl: number
  staleWhileRevalidate: boolean
  timeout: number
  onMissing: MissingPolicy
  protect: 'all' | 'marked'
  disabledClass: string
}

/** Minimal route shape used by the guard (structurally compatible with vue-router). */
export interface RouteLike {
  name?: string | symbol | null
  path: string
  fullPath: string
  meta?: Record<string | symbol, unknown>
}

/** Minimal router shape (structurally compatible with vue-router 4). */
export interface RouterLike {
  beforeEach: (guard: (to: RouteLike, from: RouteLike) => unknown) => () => void
  replace: (to: {
    name?: string
    path?: string
    query?: Record<string, string>
  }) => unknown
  currentRoute: { value: RouteLike }
  hasRoute: (name: string) => boolean
}
