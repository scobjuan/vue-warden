# Project rules

These rules are binding for every contributor, human or automated.
Rules marked (enforced) are checked by tooling; the rest are checked in review.

## Git and releases

- Commits follow Conventional Commits (enforced by commitlint).
  Emojis are allowed only in commit messages and only where the Conventional
  Commits convention contemplates them.
- Versioning follows Semantic Versioning (release-please derives versions from
  commit types: `fix` -> patch, `feat` -> minor, `!` or `BREAKING CHANGE` -> major).
- Everything in git and GitHub (commits, pushes, branches, pull requests,
  releases) is authored by the repository owner. Never leave a trace of an
  agent or tool: no `Co-Authored-By` trailers, no "generated with" footers,
  no tool names in code, comments, docs, commit messages or PR text.
- Never push or open a pull request without explicit approval from the owner.

## Style (enforced by Prettier and ESLint)

- Single quotes. No semicolons. Two-space indentation. No trailing commas.
- No emojis anywhere in code, docs, comments or agent files.
- English everywhere: code, comments, docs, commits, agent files.

## Code

- TypeScript strict. No `any` (use `unknown` and narrow). Explicit types on
  every public API. JSDoc on every exported function and type (enforced).
- File names are kebab-case; Vue components are PascalCase; one responsibility
  per file; named exports only (no default exports); imports sorted (enforced).
- Zero runtime dependencies. `vue` is a peer dependency; `vue-router` is an
  optional peer dependency.
- No module-level mutable state: all state lives in the per-app instance
  created by `createWarden()` so the package is SSR-safe.
- User callbacks (`fetchPermissions`, `transform`, `onDenied`, `onError`) must
  always run through `core/safe.ts`. The package never throws into the host app.
- Dev-only warnings are guarded by `__DEV__` so they are stripped in production.

## Quality

- Every change in `packages/vue-warden/src` ships with unit tests.
  Coverage must stay at or above 90% (enforced in CI).
- Bundle budget: core stays under 4 KB gzip (`pnpm size`, enforced in CI).
- Hooks: pre-commit runs lint-staged, typecheck and `memory:check`;
  commit-msg runs commitlint; pre-push runs the unit tests.

## Documentation

- Behavior changes update `docs/` and, when visible, the README and screenshots.
- `.agents/MEMORY.md` is updated at the end of every session (max 250 lines).
