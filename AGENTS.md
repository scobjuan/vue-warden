# AGENTS.md

Entry point for any automated coding agent working in this repository.

## Project

`vue-warden` is a Vue 3 package for declarative, backend-driven access control.
On each navigation the route key is sent to a backend that answers which
components and inputs the user may see or edit. The UI is hidden, disabled or
blocked without hand-written conditionals. Goals: near-zero overhead,
fault tolerance (never throw into the host app), full customization
(including the "access denied" UI), zero runtime dependencies.

## Layout

- `packages/vue-warden/` - the published package (`src/`, `tests/unit/`)
- `examples/` - sample apps (vite-vue, quasar, vuetify, nuxt)
- `e2e/` - Playwright specs, mock backend and screenshot script
- `docs/` - user documentation, one markdown file per topic
- `.agents/` - rules, memory and plans for agents (see below)

## Commands

| Command              | Purpose                           |
| -------------------- | --------------------------------- |
| `pnpm install`       | Install all workspaces            |
| `pnpm lint`          | ESLint (includes Prettier rules)  |
| `pnpm typecheck`     | TypeScript strict check           |
| `pnpm test`          | Unit tests (Vitest)               |
| `pnpm test:coverage` | Unit tests with coverage gate     |
| `pnpm test:e2e`      | Playwright end-to-end tests       |
| `pnpm build`         | Build the package                 |
| `pnpm size`          | Bundle size budget check          |
| `pnpm screenshots`   | Regenerate README images          |
| `pnpm memory:check`  | Validate `.agents/MEMORY.md` size |

## Mandatory session protocol

1. START of every session: read `.agents/RULES.md`, then `.agents/MEMORY.md`,
   then the active plan in `.agents/plans/`.
2. BEFORE writing any helper or utility: check the "Existing utilities"
   section of `.agents/MEMORY.md` and reuse what is there.
3. END of every session: update `.agents/MEMORY.md`:
   - refresh "Current state" and "Direction / next steps"
   - register every new reusable utility under "Existing utilities"
   - record decisions and lessons learned
   - DELETE anything obsolete or already resolved (git keeps history)
   - keep the file at 250 lines or fewer (`pnpm memory:check` enforces it)
4. Never commit work that fails `pnpm lint`, `pnpm typecheck` or `pnpm test`.

The project rules in `.agents/RULES.md` are binding. When a rule conflicts with
a default behavior of your tooling, the rule wins.
