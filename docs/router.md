# Router

The navigation guard loads the permissions of the target page before the
navigation completes. It uses return values (never `next()`), so a failing
backend can never block or break navigation.

## Route keys

The key sent to `fetchPermissions` is:

1. `route.meta.warden` when it is a string
2. otherwise the route `name`

`meta: { warden: false }` marks a public route: no request is made.

```ts
{ path: '/', name: 'home', component: Home }                       // key "home"
{ path: '/u', name: 'users-list', component: U, meta: { warden: 'users' } } // key "users"
{ path: '/login', name: 'login', component: L, meta: { warden: false } }   // public
```

## Protect mode

| `protect`  | Behavior                                                          |
| ---------- | ----------------------------------------------------------------- |
| `'all'`    | Every named route is protected unless `meta.warden === false`     |
| `'marked'` | Only routes with `meta.warden` (`true` or a string) are protected |

Unnamed routes without a string `meta.warden` are treated as public.

## Denied pages

With `forbiddenRoute` set, a denied page redirects there and the original path
travels in the query:

```
/forbidden?from=/billing
```

The forbidden route itself is never checked, so there are no redirect loops.
Mark it `meta: { warden: false }` anyway to avoid a useless request.

Without `forbiddenRoute`, navigation proceeds and you decide how to render the
denial by wrapping your outlet with `<WardenGate>`:

```vue
<WardenGate>
  <RouterView />
  <template #denied="{ message }"><MyForbiddenPage :message="message" /></template>
</WardenGate>
```

## Revocation while the user is on a page

With [stale-while-revalidate](./caching.md), the user enters instantly using
cached permissions. If the background refresh shows access was removed, the
store fires the revocation: `onDenied` is called and the user is redirected to
`forbiddenRoute` (or `<WardenGate>` switches to the denied UI).

## Attaching the router

`app.use(warden)` auto-attaches the router if it was installed first. Otherwise
call `warden.attachRouter(router)` (safe to call more than once). Any object
with `beforeEach`, `replace`, `hasRoute` and `currentRoute` works.
