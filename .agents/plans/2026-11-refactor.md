# Plan: vue-warden v1 - full refactor

## Context

`vue-warden` is a Vue 3 package for declarative, backend-driven access control: on every navigation the
route key is sent to a user-provided backend, which answers permissions for page -> components -> inputs.
The UI hides / disables / blocks without hand-written conditionals.

The current code (0.0.0, never published) does not work:

- `src/stores/permissions.store.ts:189` uses `Array.isArray` on an object -> permissions are always `{}`.
- `src/routerWarder.ts:161` stores the full axios response, not `.data`; `:171-177` calls `next()` twice; no try/catch (network error breaks host navigation).
- `src/PermissionWrapper.ts:36` snapshots permissions at import time (never reactive); `:38` module-global `componentContext` shared across instances; `allowInput` logic inverted; only direct children inspected; result of `filter().map()` discarded; sets `disable` instead of `disabled`; slots read once in `setup`.
- Name `vue-access-control` + `private: true`, no lib build, obsolete `@types/vue-router@2`, vendored 1000-line `axios.d.ts`, no entry point, no tests.

Goal: a rewrite that is correct, near-zero overhead, fault-tolerant (never throws into the host app), fully customizable (including the "access denied" UI), tested (unit + e2e), documented, with agent-workflow files.

## Confirmed decisions

| Topic                   | Decision                                                                                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm name                | `vue-warden` (unscoped, verified free)                                                                                                                                                               |
| HTTP                    | User-provided `fetchPermissions(routeKey, ctx)`; zero runtime deps; docs show axios/fetch recipes                                                                                                    |
| Cache                   | Per-route in-memory cache, TTL, stale-while-revalidate, in-flight dedupe, `invalidate()` / `clear()`                                                                                                 |
| Revocation              | Reactive update; if page access lost after background refresh -> redirect to forbidden + `onDenied`                                                                                                  |
| Failures / missing keys | Deny by default (`onMissing: 'deny' \| 'allow'`), use valid cache before denying, `onError` hook, never throw to host                                                                                |
| Backend contract        | Current shape kept as official; optional `transform(raw)`; normalized internally to `Map`s (O(1))                                                                                                    |
| Public API              | `<Warden>` (context via provide/inject) + `v-warden` directive + `useWarden()` composable + `<WardenField>` slot component                                                                           |
| Hide / disable          | `can_view=false` -> node removed; `can_edit=false` -> `disabled`, `aria-disabled`, `inert` + configurable class; `<WardenField v-slot="{ canView, canEdit }">` for prop-level control                |
| Denied UI               | 3 levels: global `deniedComponent` + `onDenied(ctx)`; per-instance `#denied` slot / `silent`; code `guard(key, fn)`. Ships accessible default alert themable via CSS variables                       |
| Routes                  | Key = `meta.warden` ?? `route.name`; `meta: { warden: false }` = public; global mode `protect: 'all' \| 'marked'`; denied -> `forbiddenRoute` (with `?from=`) or render `deniedComponent`            |
| Other routes (menus)    | `canAccessRoute(key)` / `<Warden route>` fetch on demand (dedupe); optional `fetchManyPermissions(keys)`; `prefetch(keys)`                                                                           |
| Environments            | Vue >=3.3, vue-router 4 optional peer; state per app instance (SSR-safe); no Nuxt module yet                                                                                                         |
| Tests                   | Vitest + @vue/test-utils + happy-dom, v8 coverage >=90%; Playwright e2e on base example with mocked backend; Playwright also generates README screenshots                                            |
| Examples                | `examples/vite-vue` (base, e2e target), `examples/quasar`, `examples/vuetify`, `examples/nuxt`                                                                                                       |
| Tooling                 | pnpm workspaces (drop yarn.lock), tsdown build (ESM + d.ts), size-limit < 4 KB gzip core                                                                                                             |
| Releases                | release-please + GitHub Actions, npm provenance, using user PAT secret `RELEASE_TOKEN` so everything is authored by the user                                                                         |
| Agent files             | `AGENTS.md` (root), `.agents/RULES.md`, `.agents/MEMORY.md` (<=250 lines), `.agents/plans/`                                                                                                          |
| Tool entry files        | Not versioned; local pointer file to `AGENTS.md`, listed in `.git/info/exclude`                                                                                                                      |
| Language                | English everywhere (code, docs, agent files, commits)                                                                                                                                                |
| Docs                    | Concise README + `docs/*.md` per topic                                                                                                                                                               |
| Git                     | Branch `refactor/v1`, one conventional commit per step, push + PR at end; author = Juan A. Escobar; NO `Co-Authored-By`, no agent mentions anywhere (user instruction overrides default attribution) |

## Repository layout

```
vue-warden/
  AGENTS.md
  .agents/{RULES.md, MEMORY.md, plans/2026-11-refactor.md}
  packages/vue-warden/
    src/
      index.ts                 # public exports only (named, no default exports)
      plugin.ts                # createWarden(options) -> { install, store }
      core/
        types.ts               # public + internal types
        options.ts             # defaults + validation (warn in dev, never throw at runtime)
        normalize.ts           # raw/transform -> NormalizedPage { access, components: Map<key, {access, inputs: Map}> }
        cache.ts               # TTL + SWR + in-flight dedupe (Map<key, Entry>)
        store.ts               # reactive per-app store (shallowRef/shallowReactive), resolve(key) O(1)
        resolve.ts             # 'component.input' key parsing + decision (allow/deny/missing policy)
        safe.ts                # safeCall(fn, onError) wrapper - single place for error isolation
      router/guard.ts          # installGuard(router, store, options): return-value style (no next())
      components/{Warden.ts, WardenField.ts, WardenDenied.ts}
      directive/v-warden.ts
      composables/use-warden.ts  # can, canView, canEdit, guard, canAccessRoute, prefetch, invalidate, status
      styles/denied.css        # optional, CSS variables
    tests/unit/**              # mirrors src
    package.json, tsdown.config.ts, vitest.config.ts, .size-limit.json
  examples/{vite-vue, quasar, vuetify, nuxt}/   # consume workspace:*
  e2e/                          # Playwright specs + mock backend + screenshot script
  docs/                         # getting-started, configuration, backend-contract, router, components,
                                # directive, composable, denied-ui, caching, error-handling, menus-and-prefetch,
                                # ssr, testing, migration-from-0.x, api-reference
  docs/images/                  # generated screenshots
  .github/workflows/{ci.yml, release.yml}
  eslint.config.js, .prettierrc.json, commitlint.config.js, .husky/, pnpm-workspace.yaml, release-please-config.json
```

## Key architecture points (performance + robustness)

- No VNode tree walking. `<Warden>` provides a computed component context; `v-warden` resolves via inject -> `Map.get` (O(1)); updates only when that key's permission object identity changes.
- Store uses `shallowRef` per page; normalized objects frozen; no deep reactivity.
- Guard: cache hit -> synchronous allow + background revalidate; miss -> await fetch (deduped, optional `timeout`, AbortController on superseded navigations).
- Every user callback (`fetchPermissions`, `transform`, `onDenied`, `onError`) runs through `safe.ts`; errors routed to `onError` and the deny/allow policy, never re-thrown.
- Dev-only warnings (`import.meta.env.DEV` / `__DEV__`) stripped in prod build; `sideEffects` set for tree shaking.
- Public types exported; `createWarden` options fully typed with JSDoc.

## RULES.md content (enforced where possible)

Conventional commits (commitlint), semver (release-please), single quotes / no semicolons / 2-space indent / no trailing commas (Prettier, existing `.prettierrc.json`), no emojis outside allowed commit types, no references to AI agents or tools in code/commits/PRs/git metadata (author = user, no Co-Authored-By), strict TS + `no-explicit-any` + JSDoc on exports (ESLint), kebab-case files / PascalCase components / named exports / sorted imports (ESLint), tests required for `src/` changes + coverage >=90%, size budget < 4 KB gzip (size-limit in CI), zero runtime deps. Hooks: pre-commit = lint-staged + typecheck + `memory:check`; commit-msg = commitlint; pre-push = unit tests.

## AGENTS.md (short entry point)

Project purpose, layout, commands (`pnpm i`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `pnpm lint`, `pnpm screenshots`), and a mandatory session protocol:

1. Start: read `.agents/RULES.md` then `.agents/MEMORY.md` (and active plan in `.agents/plans/`).
2. Before writing a helper: check MEMORY "Existing utilities" and reuse.
3. End: update MEMORY (state, next steps, new utilities, decisions, gotchas, recent changes), delete obsolete lines, keep <=250 lines (`pnpm memory:check`).

## MEMORY.md format (approved)

Sections with line caps: Current state (<=20), Direction / next steps (<=20), Existing utilities - USE, don't duplicate (<=60), Architecture decisions (<=50), Learnings / gotchas (<=50), Recent changes (<=30). One-line dated entries; resolved items deleted (git keeps history). Seeded at end of this refactor.

## Execution phases (each = 1+ conventional commits on `refactor/v1`)

1. `chore`: pnpm workspace, move package to `packages/vue-warden`, remove yarn.lock / axios.d.ts / old types deps, tsdown, vitest, size-limit, ESLint (add vue, import sort, naming rules), husky + lint-staged; copy plan to `.agents/plans/`.
2. `docs`: AGENTS.md, `.agents/RULES.md`, initial `.agents/MEMORY.md`; local (git-excluded) pointer file to AGENTS.md.
3. `feat`: core (types, options, normalize, cache, store, resolve, safe) + unit tests.
4. `feat`: router guard + plugin `createWarden` + tests.
5. `feat`: `<Warden>`, `v-warden`, `<WardenField>`, default `<WardenDenied>` + CSS, `useWarden` + tests.
6. `feat`: examples (vite-vue, quasar, vuetify, nuxt) with mock backend.
7. `test`: Playwright e2e (page denied/redirect, component denied + custom slot, hidden/disabled inputs, guard() in code, SWR revocation, backend failure, menus prefetch) + screenshot script.
8. `docs`: README (intro, install, quick start, screenshots, links) + `docs/*.md` (incl. migration from 0.x API).
9. `ci`: ci.yml (lint, typecheck, unit+coverage, build, size, e2e), release.yml (release-please with `RELEASE_TOKEN`, npm publish --provenance); `package.json` `name: vue-warden`, version `0.1.0`, exports/peerDeps.
10. Update MEMORY.md, push branch, open PR (authored by user, no attribution footer).

## Verification

- `pnpm lint && pnpm typecheck` clean; `pnpm test --coverage` >=90%; `pnpm build` + `pnpm size` under budget.
- `pnpm test:e2e` green on examples/vite-vue; manually run `pnpm --filter quasar|vuetify|nuxt dev` and smoke-check denied/disabled behavior.
- `pnpm screenshots` regenerates `docs/images/*` used in README.
- `npm pack --dry-run` in package: only `dist/`, README, LICENSE.
- `git log` shows only user as author, no Co-Authored-By / agent mentions; `wc -l .agents/MEMORY.md` <= 250.

## User actions required

- Add the `RELEASE_TOKEN` secret (personal PAT) and configure the npm trusted publisher (no npm token).
- Install deps when asked (pnpm available; Playwright browsers download).

## Implementation notes (deviations from the plan)

- Directive hides with `display: none` (nodes cannot be removed from a directive); `WardenField`/`Warden` remove nodes.
- `WardenGate` added to render the denied UI for pages when no `forbiddenRoute` redirect is used.
- Directive finds its section through a `display: contents` wrapper rendered by `Warden`.
- `DeniedContext` uses `target` (`key` is a reserved Vue prop); the instance type is `WardenInstance`.
- AbortController is used for request timeouts only, not for superseded navigations.
- Dev-only warnings were dropped (no `__DEV__`); option validation throws early instead.
