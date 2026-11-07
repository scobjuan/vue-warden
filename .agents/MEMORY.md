# Project memory (max 250 lines, prune every session)

Updated: 2026-11-07

## Current state (max 20)

- `vue-warden@0.1.0` published on npm (repo is public) via release-please + GitHub Actions.
- Package in `packages/vue-warden`: core, guard, components, directive, composable.
- 196 unit tests, 25 Playwright e2e on `examples/vite-vue`; CI green on `main`.
- Examples: vite-vue (e2e target), quasar, vuetify, nuxt (SSR); only vite-vue has e2e.
- Publishing moves to npm trusted publishing (OIDC); `NPM_TOKEN` is being retired.
- Releases: merge conventional commits to `main`, then merge the release-please PR.

## Direction / next steps (max 20)

- [ ] Owner: configure the trusted publisher on npm, then verify the next release publishes without a token.
- [ ] After that release succeeds: delete the `NPM_TOKEN` secret and revoke the token on npm.
- [ ] Smoke-test quasar/vuetify/nuxt examples in a browser.
- [ ] Optional: Nuxt module, `v-warden` SSR props, abort on superseded navigations.

## Existing utilities - USE, do not duplicate (max 60)

- `core/safe.ts` `safe(fn, onError, fallback)` / `report(error, onError)`: error isolation for user callbacks.
- `core/normalize.ts` `normalize(raw, key)` / `fallbackPage(key, allow)`: payload -> frozen Maps.
- `core/resolve.ts` `splitKey`, `resolveComponent`, `resolveInput`: the only place deciding allow/deny.
- `core/messages.ts` `deniedContext(kind, key)`: builds DeniedContext (field is `target`, not `key`).
- `core/cache.ts` `createCache(ttl, load, now?)`: TTL + in-flight dedupe; clock injectable in tests.
- `core/store.ts` `createStore(options)`: reactive pages Map, `load/prefetch/invalidate/clear`, `onRevoked`.
- `context.ts` `useWardenInstance()`, `pageFor(store, route?)`, `WARDEN_KEY`, `COMPONENT_KEY`.
- `components/denied.ts` `renderDenied(warden, slot, ctx)`: slot -> global component -> built-in alert.
- `router/guard.ts` `routeKey(route, protect)`, `installGuard(deps)`.
- `tests/helpers.ts` `readyWarden(overrides, page)` and `mountWith(warden, component)`; `tests/fixtures.ts` `rawPage`.
- `e2e/specs/helpers.ts` `openAs(page, role, path)`, `trackRequests(page)`.
- `examples/shared`: mock backend (`permissionsFor`, vite plugin `mockPermissionsApi`, `fetchPermissions`).
- `scripts/memory-check.mjs`: validates this file (250 lines, per-section caps).

## Architecture decisions (max 50)

- 2026-11-07 Fetcher is user-provided, no axios dependency (bundle size, agnostic).
- 2026-11-07 Permissions normalized to frozen Maps (O(1)); SWR cache per route; shallowReactive store.
- 2026-11-07 Deny by default on error or missing key, configurable via `onMissing`.
- 2026-11-07 No default exports; all state per app instance (SSR-safe).
- 2026-11-07 Directive context found via DOM (`closest('[data-warden-component]')`) because directives cannot inject; `<Warden>` renders a `display: contents` wrapper.
- 2026-11-07 Directive hides with `display:none` (cannot remove nodes); true removal = `WardenField`/`Warden`.
- 2026-11-07 Denied components get props `kind`, `target`, `message` (`key` is reserved in Vue).
- 2026-11-07 Component named `Warden`; instance type is `WardenInstance`.
- 2026-11-07 Guard sets `store.current` before awaiting warm pages so background revocation is detected.
- 2026-11-07 Router typed structurally (`RouterLike`) so vue-router stays an optional peer.
- 2026-11-07 Release: release-please with owner PAT so authorship is the owner.

## Learnings / gotchas (max 50)

- `pnpm view` output is unreliable here; use `npm view` for versions.
- yarn is not installed; pnpm 12 blocks install scripts: approve in `pnpm-workspace.yaml` `allowBuilds`.
- Vite configs load shared TS through Node: use explicit `.ts` extensions in `examples/shared`.
- Vitest needs alias `vue` -> `vue/dist/vue.esm-bundler.js` to mount string templates.
- vue-router does not encode `/` in query values (`?from=/billing`).
- Playwright `page.clock.install()` + `fastForward` makes SWR expiry testable.
- release-please from `0.0.0` jumps to 1.0.0: force a version with a `Release-As: x.y.z` commit footer.
- npm rejects provenance from private repos; the repo must stay public.
- npm registry views lag a minute after publish (a `0.0.0-stage` stub is normal).
- Examples consume the built `dist` of the package: run `pnpm build` first.
- Test pitfalls: `<Warden>` unmounts children when denied (query them outside it); a revocation test must not deny the other routes too.
- eslint-plugin-prettier + `no-confusing-void-expression`: use braces in arrow callbacks.
- Tool-specific entry files that only point to `AGENTS.md` stay local, excluded via `.git/info/exclude`; never version them.

## Recent changes (max 30)

- 2026-11-07 Monorepo: pnpm workspaces, tsdown, vitest, size-limit, ESLint, husky hooks.
- 2026-11-07 Core, guard/plugin, components/directive/composable with unit tests.
- 2026-11-07 Examples (4), Playwright e2e + screenshots, README and docs, CI and release workflows.
- 2026-11-07 First release 0.1.0 published; publish job moved to OIDC trusted publishing.
