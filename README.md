# Vue Access Control

## Concepts

1. `Page`: Is a component container and where a route redirects.
2. `Component`: Is a container of inputs. A little section for each application functionality.
3. `Input`: Element that allows enter data or interact with the application.

![Concepts image](./concepts.png)

## How is each element restricted?

| Element     | Restricted by |
| ----------- | ------------- |
| `Page`      | Route key     |
| `Component` | Component key |
| `Input`     | Input key     |

1. Route key is a field add to the route of `vue-router`. With this field we will know if the user is allowed is x page.
2. Component key is a v-bind for recognize what section of permission object we should iterate. Obviusly, it helps also for know if the user can view it.
3. Input key is a v-bind for recognize what inputs user can view and edit.

> Note: Key component and key input, allows that we don't need specific what is the component father that contain x input.

```html
<!-- We dont want to reapeat for each input what is his component father -->

<FormNewUser>
  <TextInput label="Username" input-key="form-new-user.username">
  <TextInput label="email" input-key="form-new-user.email">
</FormNewUser>
```

```html
<!-- This we can skip reapeat the component father for each input -->

<FormNewUser component-key="form-new-user">
  <TextInput label="Username" input-key="username">
  <TextInput label="email" key="email">
</FormNewUser>
```

## How is restricted the access to pages?

When the route is changed that change is intercepted for beforeEach() vue-router's method, and do a request to the backend, get the new permission for the page whit 'x' name, which one is determined according to the route name. For example:

```ts
// Routes
const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { name: 'home', path: '', component: () => import('pages/IndexPage.vue') }
    ]
  }
]

export default routes
```

```ts
// Request to backend looks like
await axios(
  method: config.permissionApiMethod,
  url: config.permissionsApiUrl,
  data: {
    pageKey: to.name // to.name is the name of the route. So, for this example, will be 'home'
  }
)
```

```json
// Backend responde
{
  "key": "home",
  "can_access": true, // If this is false, the user can't access to the route whit name 'home', so is redirected to the forbiddenRoute
  "components": [
    {
      // ...
      "inputs": [
        // ...
      ]
    }
  ]
}
```

### A backend response complete

```json
{
  "key": "users",
  "can_access": true,
  "components": [
    {
      "key": "filter",
      "can_access": true,
      "inputs": [
        {
          "key": "username",
          "can_view": true,
          "can_edit": true
        },
        {
          "key": "email",
          "can_view": true,
          "can_edit": false
        },
        {
          "key": "password",
          "can_view": false,
          "can_edit": false
        }
      ]
    },
    {
      "key": "new",
      "can_access": true,
      "inputs": [
        {
          "key": "username",
          "can_view": true,
          "can_edit": true
        },
        {
          "key": "email",
          "can_view": true,
          "can_edit": true
        },
        {
          "key": "password",
          "can_view": true,
          "can_edit": true
        }
      ]
    }
  ]
}
```
