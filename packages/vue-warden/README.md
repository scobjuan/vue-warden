# vue-warden

Declarative, backend-driven access control for Vue 3. Hide, disable or block
pages, sections and inputs without writing permission conditionals.

```ts
import { createWarden } from 'vue-warden'
import 'vue-warden/style.css'

app.use(router).use(
  createWarden({
    fetchPermissions: (key) =>
      fetch(`/api/permissions?page=${key}`).then((r) => r.json()),
    forbiddenRoute: 'forbidden'
  })
)
```

```vue
<Warden component-key="new-user">
  <input v-warden="'username'" />
  <input v-warden="'password'" type="password" />
</Warden>
```

Full documentation, backend contract, examples and screenshots:
https://github.com/scobjuan/vue-warden

MIT
