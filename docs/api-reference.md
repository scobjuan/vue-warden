# API reference

## `createWarden(options): WardenInstance`

Creates the instance. See [Configuration](./configuration.md).

```ts
interface WardenInstance {
  readonly store: WardenStore
  readonly options: ResolvedOptions
  install(app: App): void // used by app.use()
  attachRouter(router: RouterLike): void // idempotent
  deny(ctx: DeniedContext): void // fires onDenied safely
}
```

`store` (advanced):

| Member             | Description                                      |
| ------------------ | ------------------------------------------------ |
| `pages`            | Reactive `Map` of loaded pages                   |
| `current`          | Ref-like holder with the current page key        |
| `load(key)`        | Resolve a page honoring cache, SWR and fallbacks |
| `prefetch(keys)`   | Load several pages                               |
| `invalidate(key?)` | Mark stale (reloads the current page)            |
| `clear()`          | Drop everything                                  |

## Components

`Warden`, `WardenField`, `WardenGate`, `WardenDenied`. See
[Components](./components.md).

## Composable

`useWarden(): WardenApi`. See [Composable](./composable.md).

## Directive

`v-warden`, registered by `app.use(warden)`. See [Directive](./directive.md).

## Helpers

| Export                        | Description                                                     |
| ----------------------------- | --------------------------------------------------------------- |
| `routeKey(route, protect)`    | Resolves the permission key of a route (`undefined` for public) |
| `WARDEN_KEY`, `COMPONENT_KEY` | Injection keys for the instance and the surrounding `<Warden>`  |

## Types

`WardenOptions`, `WardenInstance`, `WardenApi`, `DeniedContext`, `DeniedKind`,
`FetchContext`, `MissingPolicy`, `PagePermission`, `ComponentPermission`,
`InputPermission`, `RawPagePermission`, `RawComponentPermission`,
`RawInputPermission`, `RouteLike`, `RouterLike`.

## Stylesheet

`import 'vue-warden/style.css'` provides the default denied alert styles and
the `warden-disabled` class.
