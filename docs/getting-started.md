# Getting started

## 1. Install

```sh
pnpm add vue-warden
```

## 2. Create and install the plugin

```ts
import { createWarden } from 'vue-warden'
import 'vue-warden/style.css'

const warden = createWarden({
  fetchPermissions: async (key, { signal }) => {
    const res = await fetch('/api/permissions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pageKey: key }),
      signal
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  forbiddenRoute: 'forbidden'
})

app.use(router).use(warden)
```

`app.use(warden)` registers the `Warden`, `WardenField` and `WardenGate`
components and the `v-warden` directive globally, and attaches the navigation
guard when a router is already installed. If you install the router later, or
use a framework that owns the router, attach it explicitly:

```ts
warden.attachRouter(router)
```

## 3. Mark your routes

Routes are protected by name by default. Public routes opt out:

```ts
const routes = [
  { path: '/users', name: 'users', component: Users },
  { path: '/login', name: 'login', component: Login, meta: { warden: false } },
  {
    path: '/forbidden',
    name: 'forbidden',
    component: Forbidden,
    meta: { warden: false }
  }
]
```

## 4. Make the backend answer

For `POST /api/permissions` with `{ "pageKey": "users" }`, return:

```json
{
  "key": "users",
  "can_access": true,
  "components": [
    {
      "key": "new-user",
      "can_access": true,
      "inputs": [
        { "key": "username", "can_view": true, "can_edit": true },
        { "key": "email", "can_view": true, "can_edit": false },
        { "key": "password", "can_view": false, "can_edit": false }
      ]
    }
  ]
}
```

See [Backend contract](./backend-contract.md) for details and adapting other
formats.

## 5. Protect the UI

```vue
<Warden component-key="new-user">
  <input v-warden="'username'" />
  <input v-warden="'email'" />
  <input v-warden="'password'" type="password" />
</Warden>
```

- `username`: visible and editable.
- `email`: visible but disabled.
- `password`: hidden.

Wrap your `<RouterView>` with `<WardenGate>` if you want denied pages to show
the denied UI instead of redirecting (see [Router](./router.md)).
