# Denied UI

There are three levels; the most specific wins.

## 1. Per instance: the `#denied` slot

```vue
<Warden component-key="billing">
  <BillingForm />
  <template #denied="{ kind, target, message }">
    <MyAlert :title="target">{{ message }}</MyAlert>
  </template>
</Warden>
```

Use `silent` to render nothing. `<WardenGate>` supports the same slot.

## 2. Global: `deniedComponent`

Any Vue component. It receives three props: `kind`, `target` and `message`.

```ts
createWarden({
  fetchPermissions,
  deniedComponent: MyDeniedCard
})
```

```vue
<!-- MyDeniedCard.vue -->
<script setup lang="ts">
defineProps<{
  kind: 'page' | 'component' | 'input'
  target: string
  message: string
}>()
</script>
<template>
  <v-alert type="warning">{{ message }}</v-alert>
</template>
```

`key` is a reserved Vue prop, which is why the context uses `target`.

## 3. Code only: `onDenied` and `guard()`

```ts
createWarden({
  fetchPermissions,
  onDenied: (ctx) => toast.warn(ctx.message) // your toast/modal
})

const { guard } = useWarden()
guard('billing.export', exportCsv) // denied -> onDenied fired, nothing else rendered
```

`onDenied` fires for denied pages, denied sections rendered by `<Warden>`, and
blocked `guard()` calls.

## Built-in alert

When nothing is configured, `WardenDenied` renders an accessible
`role="status"` block. Theme it with CSS variables (import
`vue-warden/style.css`):

```css
.warden-denied {
  --warden-denied-bg: #fffbeb;
  --warden-denied-border: #fcd34d;
  --warden-denied-color: #92400e;
  --warden-denied-radius: 4px;
  --warden-denied-padding: 8px 12px;
}
```

You can also import `WardenDenied` and reuse it inside your own component.
