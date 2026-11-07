# Composable: `useWarden()`

Use it in `setup()` for logic that does not map to markup. Checks are reactive:
use them in templates, `computed` and `watch`.

```ts
import { useWarden } from 'vue-warden'

const { can, canView, guard, canAccessRoute, prefetch, invalidate, clear } =
  useWarden()
```

## Paths

A path is `component` or `component.input` (split on the first dot).

| Call            | `component`      | `component.input` |
| --------------- | ---------------- | ----------------- |
| `can(path)`     | component access | input can edit    |
| `canEdit(path)` | alias of `can`   | alias of `can`    |
| `canView(path)` | component access | input can view    |

Inside a `<Warden route="x">`, checks use that page; otherwise the current page.

## `guard(path, fn)`

Runs `fn` only when `can(path)` is true and returns its result. Otherwise it
calls your `onDenied` hook and returns `undefined`:

```ts
const { guard } = useWarden()

function exportCsv() {
  guard('report.export', () => api.export())
}
```

## Routes, prefetch and cache control

| Method                | Description                                                          |
| --------------------- | -------------------------------------------------------------------- |
| `canAccessRoute(key)` | Whether the user may open a route. Loads it on demand (deduplicated) |
| `prefetch(keys)`      | Loads several routes ahead of time (batch fetcher if provided)       |
| `invalidate(key?)`    | Marks cache stale; reloads the current page                          |
| `clear()`             | Drops every permission, for example on logout                        |

`useWarden()` throws a clear error if the plugin is not installed.
