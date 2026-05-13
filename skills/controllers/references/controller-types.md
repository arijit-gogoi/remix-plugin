# Controller Types

```ts
import type { Controller } from 'remix/fetch-router'

export default { actions: { … } } satisfies Controller<typeof routes.X, AppContext>
```

## `Controller<RouteOrMap, Context>`

The first type parameter is the route (leaf) or route map. The second is the application context type (usually exported from `app/router.ts`).

For a leaf:

```ts
Controller<typeof routes.home, AppContext>
// → { actions: { index: Action<…> }, middleware?: Middleware[] }
```

For a route map (mirror shape):

```ts
Controller<typeof routes.admin.books, AppContext>
// → {
//     middleware?: Middleware[],
//     actions: {
//       index:    Action,
//       new:      Action,
//       create:   Action,
//       show:     Action,
//       edit:     Action,
//       update:   Action,
//       destroy:  Action,
//     },
//   }
```

For a nested map of maps, the shape nests too — each child is a `Controller<…>` in its own right.

## Action signatures

```ts
type Action<Route, Context> = (handle: {
  get:     <K>(key: Key<K>) => K
  params:  ParamsOf<Route>
  request: Request
  url:     URL
}) => Response | Promise<Response>
```

Or the object form, which lets you stack action-level middleware:

```ts
{
  middleware: [/* … */],
  handler: ({ get, params, request, url }) => { /* … */ },
}
```

## The `AppContext` type

Define it once in `app/router.ts` so every controller stays consistent:

```ts
import type { RequestContext } from 'remix/fetch-router'
import type { Database } from 'remix/data-table'
import type { Session } from 'remix/session'
import type { Auth } from 'remix/auth-middleware'

export type AppContext = RequestContext & {
  // anything your middleware sets — only used in type intersections
  database: Database
  session:  Session<AppSession>
  auth:     Auth<User>
}
```

In practice this type rarely needs the explicit field set — `get(Key)` infers correctly from the keys themselves.

## `satisfies` vs explicit annotation

Prefer `satisfies Controller<…>`:

```ts
export default {
  actions: { … },
} satisfies Controller<typeof routes.X, AppContext>
```

- `satisfies` keeps the inferred narrower type (so `params.bookId` stays typed as the literal string).
- Explicit `: Controller<…>` widens — you lose param literal types.
