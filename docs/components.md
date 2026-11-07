# Components

All three are registered globally by `app.use(warden)` and also exported for
local import.

## `<Warden>`

Guards a section. Provides its context to descendants.

| Prop            | Type      | Default      | Description                                              |
| --------------- | --------- | ------------ | -------------------------------------------------------- |
| `component-key` | `string`  | required     | Component key from the backend response                  |
| `route`         | `string`  | current page | Read permissions of another page (loaded on demand)      |
| `silent`        | `boolean` | `false`      | Render nothing instead of the denied UI                  |
| `as`            | `string`  | `'div'`      | Wrapper element. It is rendered with `display: contents` |

Slots: `default` (allowed content) and `denied` with `{ kind, target, message }`.

```vue
<Warden component-key="billing">
  <BillingForm />
  <template #denied="{ message }"><MyAlert>{{ message }}</MyAlert></template>
</Warden>
```

The wrapper element carries `data-warden-component`, which `v-warden` uses to
find its section at any nesting depth.

While a section with an explicit `route` is still loading, nothing is rendered
(no flash of the denied UI).

## `<WardenField>`

Renders its default slot only when the input is viewable and exposes the flags,
so you can drive any UI library prop:

```vue
<WardenField field="email" v-slot="{ canView, canEdit }">
  <q-input label="Email" :disable="!canEdit" />   <!-- Quasar -->
  <v-text-field :disabled="!canEdit" />           <!-- Vuetify -->
</WardenField>
```

| Prop        | Description                                                            |
| ----------- | ---------------------------------------------------------------------- |
| `field`     | Input key. Inside `<Warden>` it is relative to the section             |
| `component` | Optional explicit component key (overrides the surrounding `<Warden>`) |

Outside a `<Warden>`, use the full path: `field="new-user.email"`.

Use `WardenField` (instead of the directive) when the element must be removed
from the DOM rather than hidden, for example for sensitive content.

## `<WardenGate>`

Wraps your page outlet and renders the denied UI when the current page is
denied and no `forbiddenRoute` redirect happened.

```vue
<WardenGate><RouterView /></WardenGate>
```

It also supports a `#denied` slot with `{ kind, target, message }`.
