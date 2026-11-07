# Directive: `v-warden`

```vue
<Warden component-key="new-user">
  <input v-warden="'username'" />
</Warden>

<!-- outside <Warden>: use the full path -->
<input v-warden="'new-user.username'" />
```

## Behavior

| Permission                        | Effect on the element                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `can_view: false`                 | `display: none !important` and `aria-hidden="true"`                                                |
| `can_view: true, can_edit: false` | native `disabled` (when supported), `aria-disabled="true"`, `inert`, and the `disabledClass` class |
| fully allowed                     | untouched                                                                                          |

Everything is reverted when permissions change (the directive is reactive), and
elements that were natively disabled beforehand stay disabled.

## Limits

- The element is hidden, not removed from the DOM. For content that must not
  exist in the DOM, use [`<WardenField>`](./components.md) or `<Warden>`.
- It acts on the element's root. UI libraries that render the real input deeper
  (Quasar, Vuetify) are blocked through `inert`, but for the library's own
  disabled styling use `<WardenField v-slot="{ canEdit }">`.
- On the server it has no effect; permissions are applied after hydration.
  Prefer `Warden` / `WardenField` for server-rendered content.
- The value is a string key; it may change over time.

## Styling

`disabledClass` defaults to `warden-disabled`, styled by `vue-warden/style.css`
(reduced opacity, `not-allowed` cursor). Override or rename it freely.
