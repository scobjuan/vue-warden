# SSR and Nuxt

State lives inside the instance returned by `createWarden`, not in module
variables, so concurrent server requests never share permissions.

## Rules

- Create one `createWarden()` per app (per request on the server).
- Forward the request cookies/headers in `fetchPermissions` when rendering on
  the server.
- `Warden`, `WardenField` and `WardenGate` render on the server. The
  `v-warden` directive does not; it applies after hydration. Prefer components
  for server-rendered content.
- Call `clear()` when the session changes.

## Nuxt

Nuxt owns the router, so attach it explicitly in a plugin
([full example](../examples/nuxt)):

```ts
// plugins/warden.ts
import { createWarden } from 'vue-warden'

export default defineNuxtPlugin((nuxtApp) => {
  const requestFetch = useRequestFetch() // forwards cookies during SSR
  const warden = createWarden({
    forbiddenRoute: 'forbidden',
    protect: 'marked',
    fetchPermissions: (key) =>
      requestFetch('/api/permissions', {
        method: 'POST',
        body: { pageKey: key }
      })
  })
  nuxtApp.vueApp.use(warden)
  warden.attachRouter(nuxtApp.$router as never)
})
```

Mark pages with `definePageMeta({ name: 'users', warden: true })` when using
`protect: 'marked'`.
