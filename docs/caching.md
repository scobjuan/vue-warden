# Caching

Permissions are cached in memory per page key, so repeated navigation does not
hit the backend.

## Lifecycle of a page

| State                      | What happens                                                          |
| -------------------------- | --------------------------------------------------------------------- |
| Not cached                 | Fetch (with `timeout`), normalize, publish                            |
| Fresh (age < `ttl`)        | Served synchronously, no request                                      |
| Stale and SWR on (default) | Served instantly; a background refresh updates the UI when it returns |
| Stale and SWR off          | Waits for a fresh response; keeps the previous data if it fails       |

Concurrent requests for the same key share one network call.

## Stale-while-revalidate and revocation

The user never waits when cached data exists. If the refresh shows that access
to the current page was removed, the UI updates reactively and the user is
redirected to `forbiddenRoute` (see [Router](./router.md)). If you cannot
tolerate even a moment of stale access for some pages, set
`staleWhileRevalidate: false` or a short `ttl`.

## Controlling the cache

```ts
const { invalidate, clear } = useWarden()

await invalidate('users') // mark one page stale
await invalidate() // mark all stale and reload the current page
clear() // drop everything (logout, role change)
```

Always call `clear()` on logout or when the user changes role.

## Tuning

| Need                      | Setting                                     |
| ------------------------- | ------------------------------------------- |
| Fewer requests            | Larger `ttl`                                |
| Faster revocation         | Smaller `ttl`, or SWR off                   |
| Always fresh, never stale | `ttl: 0` with `staleWhileRevalidate: false` |
