# Migrating from 0.x

The unpublished 0.x API (`init`, `routerWarder`, `PermissionWrapper`) is
replaced. The backend contract is unchanged.

| 0.x                                                                                   | 1.x                                                                        |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `init({ axiosInstance, permissionsApiUrl, permissionApiMethod, forbiddenNameRoute })` | `createWarden({ fetchPermissions, forbiddenRoute })` and `app.use(warden)` |
| `routerWarder(router)`                                                                | Automatic with `app.use(warden)`, or `warden.attachRouter(router)`         |
| Page key = `to.name` always                                                           | `meta.warden` or `to.name`; `meta.warden: false` for public routes         |
| `<PermissionWrapper>` + `component-key` prop on the child                             | `<Warden component-key>` wrapper                                           |
| `input-key` on direct children only                                                   | `v-warden` / `<WardenField>` at any depth                                  |
| `disable` prop injected into children                                                 | `disabled`, `aria-disabled`, `inert` + class, or slots flags               |
| Hard-coded "You dont have permissions" div                                            | Customizable denied UI                                                     |
| axios required                                                                        | Any HTTP client through `fetchPermissions`                                 |

```ts
// 0.x
init({
  axiosInstance: axios,
  permissionsApiUrl: '/api/permissions',
  permissionApiMethod: 'POST',
  forbiddenNameRoute: 'forbidden'
})

// 1.x
const warden = createWarden({
  fetchPermissions: (key) =>
    axios.post('/api/permissions', { pageKey: key }).then((r) => r.data),
  forbiddenRoute: 'forbidden'
})
app.use(warden)
```

```vue
<!-- 0.x -->
<PermissionWrapper>
  <FormNewUser component-key="new-user">
    <TextInput input-key="username" />
  </FormNewUser>
</PermissionWrapper>

<!-- 1.x -->
<Warden component-key="new-user">
  <FormNewUser>
    <TextInput v-warden="'username'" />
  </FormNewUser>
</Warden>
```
