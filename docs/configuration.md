# Configuration

`createWarden(options)` accepts:

| Option                 | Type                                         | Default             | Description                                                                     |
| ---------------------- | -------------------------------------------- | ------------------- | ------------------------------------------------------------------------------- |
| `fetchPermissions`     | `(key, { signal }) => Promise<unknown>`      | required            | Returns the backend response for one page key.                                  |
| `fetchManyPermissions` | `(keys, { signal }) => Promise<Record<...>>` | none                | Optional batch fetcher used by `prefetch`. Returns an object keyed by page key. |
| `transform`            | `(raw, key) => unknown`                      | identity            | Adapts a backend response to the [official contract](./backend-contract.md).    |
| `ttl`                  | `number` (ms)                                | `60000`             | How long a cached page stays fresh.                                             |
| `staleWhileRevalidate` | `boolean`                                    | `true`              | Serve expired cache instantly and refresh in the background.                    |
| `timeout`              | `number` (ms)                                | `10000`             | Aborts slow requests; counts as a failure.                                      |
| `onMissing`            | `'deny' \| 'allow'`                          | `'deny'`            | Policy for unknown keys and failed loads.                                       |
| `protect`              | `'all' \| 'marked'`                          | `'all'`             | Protect every route, or only those with `meta.warden`.                          |
| `forbiddenRoute`       | `string`                                     | none                | Route name or path used to redirect denied pages.                               |
| `deniedComponent`      | Vue component                                | built-in            | Global denied UI. See [Denied UI](./denied-ui.md).                              |
| `onDenied`             | `(ctx) => void`                              | none                | Called whenever something is denied (toasts, logging).                          |
| `onError`              | `(error) => void`                            | none                | Called on fetch, transform and hook errors.                                     |
| `disabledClass`        | `string`                                     | `'warden-disabled'` | Class added by `v-warden` to non-editable elements.                             |

Every callback is isolated: an exception inside `transform`, `onDenied` or
`onError` is contained and never reaches your app.

## Example

```ts
createWarden({
  fetchPermissions: (key) =>
    api.post('/permissions', { pageKey: key }).then((r) => r.data),
  ttl: 5 * 60_000,
  forbiddenRoute: 'forbidden',
  onMissing: 'deny',
  deniedComponent: MyDeniedCard,
  onDenied: (ctx) => toast.warn(ctx.message),
  onError: (error) => logger.error(error)
})
```

## Denied context

`onDenied` and the denied UI receive:

```ts
interface DeniedContext {
  kind: 'page' | 'component' | 'input'
  target: string // page key, component key or "component.input"
  message: string // default English message
}
```
