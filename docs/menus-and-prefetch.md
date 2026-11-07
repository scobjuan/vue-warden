# Menus and prefetch

Sidebars and menus need to know whether the user can open routes other than the
current one.

## `canAccessRoute(key)`

```vue
<script setup lang="ts">
import { useWarden } from 'vue-warden'
const { canAccessRoute, prefetch } = useWarden()
const links = ['home', 'users', 'billing']
prefetch(links)
</script>

<template>
  <template v-for="name in links" :key="name">
    <RouterLink v-if="canAccessRoute(name)" :to="{ name }">{{
      name
    }}</RouterLink>
  </template>
</template>
```

- Unknown routes are loaded on demand and deduplicated.
- While loading, the answer follows `onMissing` (`'deny'` hides the link until
  the answer arrives).
- Pages fetched this way are cached, so navigating to them is instant.

## Batch endpoint

If your backend can answer several routes in one request, provide it and
`prefetch` will use it:

```ts
createWarden({
  fetchPermissions,
  fetchManyPermissions: async (keys, { signal }) => {
    const res = await fetch('/api/permissions/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pageKeys: keys }),
      signal
    })
    return res.json() // { users: {...}, billing: {...} }
  }
})
```

Keys missing from the response are skipped; if the batch call fails, single
requests are used instead.

## `<Warden route>`

`<Warden component-key="x" route="users">` reads another page's permissions,
useful for dashboards that embed sections of several pages.
