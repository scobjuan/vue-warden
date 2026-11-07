# Backend contract

For each page key the backend returns:

```ts
interface RawPagePermission {
  key: string
  can_access: boolean
  components: Array<{
    key: string
    can_access: boolean
    inputs: Array<{ key: string; can_view: boolean; can_edit: boolean }>
  }>
}
```

## Semantics

| Flag                          | Effect                                                   |
| ----------------------------- | -------------------------------------------------------- |
| page `can_access: false`      | Everything on the page is denied; route redirects        |
| component `can_access: false` | Section replaced by the denied UI; its inputs are denied |
| input `can_view: false`       | Hidden                                                   |
| input `can_edit: false`       | Visible but disabled                                     |

Rules applied when reading the response:

- `can_edit` never wins over `can_view`: a non-viewable input is never editable.
- Any value other than the boolean `true` counts as `false`.
- Malformed entries are skipped; a non-object payload counts as a failed load.
- Keys that are absent follow `onMissing` (`'deny'` by default).
- Component keys must not contain a dot (`component.input` splits on the first one).

## Adapting another format with `transform`

If your backend answers differently, map it once:

```ts
createWarden({
  fetchPermissions: (key) => api.get(`/permissions/${key}`),
  // axios returns { data }, and the backend uses camelCase
  transform: (response) => {
    const page = (response as { data: any }).data
    return {
      key: page.pageKey,
      can_access: page.allowed,
      components: page.sections.map((s: any) => ({
        key: s.id,
        can_access: s.allowed,
        inputs: s.fields.map((f: any) => ({
          key: f.id,
          can_view: f.visible,
          can_edit: f.editable
        }))
      }))
    }
  }
})
```

## HTTP recipes

```ts
// fetch
fetchPermissions: (key, { signal }) =>
  fetch(`/api/permissions?page=${key}`, { signal }).then((r) => r.json())

// axios
fetchPermissions: (key, { signal }) =>
  axios
    .post('/api/permissions', { pageKey: key }, { signal })
    .then((r) => r.data)
```

Pass `signal` so slow requests are cancelled when `timeout` elapses.

## Security note

The frontend only reflects decisions; it is not a security boundary. Always
enforce the same rules in the backend for every real operation.
