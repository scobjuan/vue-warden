# Error handling

The package never throws into your app. Everything that can fail is contained
and reported through `onError`.

## What counts as a failure

- `fetchPermissions` rejects or throws
- the request exceeds `timeout`
- the payload is not an object
- `transform` throws

## What happens

| Situation                         | Result                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| First load fails                  | Fallback page: deny everything (`onMissing: 'deny'`) or allow everything (`'allow'`); `onError` called |
| Refresh fails but cache exists    | Cached permissions keep being used; `onError` called                                                   |
| Key missing from a valid response | `onMissing` policy for that component or input                                                         |
| `onDenied` / `onError` throws     | Swallowed; the app is unaffected                                                                       |

Navigation is never blocked: with a denied fallback and `forbiddenRoute`, the
user lands on the forbidden page; without it, `<WardenGate>` shows the denied UI.

## Choosing `onMissing`

- `'deny'` (default): safest. Unknown means no access.
- `'allow'`: use only if the backend is the real enforcement point and you
  prefer availability over restriction.

## Reporting

```ts
createWarden({
  fetchPermissions,
  onError: (error) => {
    logger.error('permissions failed', error)
  }
})
```
