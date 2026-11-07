# Project memory (max 250 lines, prune every session)

Updated: 2026-11-07

## Current state (max 20)

- Phase 2 of 10 of the refactor plan (`.agents/plans/2026-11-refactor.md`).
- Tooling migrated to a pnpm monorepo. Package source is still empty.

## Direction / next steps (max 20)

- [ ] Phase 3: core (types, options, normalize, cache, store, resolve, safe)
- [ ] Phase 4: router guard and `createWarden` plugin
- [ ] Phase 5: components, directive, composable
- [ ] Phases 6-10: examples, e2e, docs, CI, PR

## Existing utilities - USE, do not duplicate (max 60)

- (none yet)

## Architecture decisions (max 50)

- 2026-11-07 Fetcher is user-provided, no axios dependency (bundle size, agnostic).
- 2026-11-07 Permissions normalized to Maps for O(1) lookup, SWR cache per route.
- 2026-11-07 Deny by default on error or missing key, configurable via `onMissing`.
- 2026-11-07 No default exports; state per app instance for SSR safety.

## Learnings / gotchas (max 50)

- `pnpm view` output is unreliable here; use `npm view` for versions.
- yarn is not installed on the dev machine; pnpm is the package manager.

## Recent changes (max 30)

- 2026-11-07 Monorepo migration: pnpm workspaces, tsdown, vitest, size-limit, ESLint.
