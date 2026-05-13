# Route Builders — full reference

All exports from `remix/fetch-router/routes`.

## `route(...)`

```ts
route(pattern: string): Route<'ANY', pattern>
route(map: { [key: string]: PatternOrRouteOrMap }): RouteMap
route(basePattern: string, map: { [key: string]: PatternOrRouteOrMap }): RouteMap
```

### Forms

```ts
// 1. Single pattern → single Route
route('/about')                                  // Route<'ANY', '/about'>

// 2. Map of routes
route({
  home:  '/',
  about: '/about',
})

// 3. Pattern + nested map → all children get the prefix
route('admin', {
  index: '/',
  users: '/users',
})
// → routes.index = '/admin/'
// → routes.users = '/admin/users'
```

Nest unlimited:

```ts
route({
  admin: route('admin', {
    books: route('books', {
      index:  '/',
      show:   '/:id',
    }),
  }),
})
```

## Verb helpers — `get` / `post` / `put` / `del` / `patch` / `head` / `options`

Pin a single HTTP method:

```ts
get(pattern)
post(pattern)
put(pattern)
del(pattern)        // 'del' because 'delete' is reserved in some contexts
patch(pattern)
head(pattern)
options(pattern)
```

Each returns `Route<METHOD, pattern>`. The compiler will refuse to bind a controller action of a different verb.

## `form(...)`

```ts
form(pattern: string): { index: Route<'GET', …>, action: Route<'POST', …> }
form(pattern: string, options: FormOptions): { … }
```

`FormOptions`:

| Field        | Type      | Default | Notes                                       |
|--------------|-----------|---------|---------------------------------------------|
| `formMethod` | HTTP verb | `POST`  | `'PUT'`, `'PATCH'`, `'DELETE'` (via `methodOverride`) |
| `names`      | `{ action?: string; index?: string }` | `{ action: 'action', index: 'index' }` | Rename the generated route keys |

Example:

```ts
settings: form('settings', {
  formMethod: 'PUT',
  names: { action: 'update' },
})
// routes.settings.index  : GET /settings
// routes.settings.update : PUT /settings
```

## `resources(...)`

```ts
resources(pattern: string, options?: ResourcesOptions): {
  index?, new?, create?, show?, edit?, update?, destroy?
}
```

`ResourcesOptions`:

| Field    | Type                                      | Notes                              |
|----------|-------------------------------------------|------------------------------------|
| `only`   | `Array<'index' \| 'new' \| 'create' \| 'show' \| 'edit' \| 'update' \| 'destroy'>` | Whitelist |
| `except` | same union                                 | Blacklist                          |
| `param`  | `string`                                   | Param name (default: singularised) |

The full RESTful suite, given `resources('books', { param: 'bookId' })`:

| Action  | Method | Path                |
|---------|--------|---------------------|
| index   | GET    | `/books`            |
| new     | GET    | `/books/new`        |
| create  | POST   | `/books`            |
| show    | GET    | `/books/:bookId`    |
| edit    | GET    | `/books/:bookId/edit` |
| update  | PUT    | `/books/:bookId`    |
| destroy | DELETE | `/books/:bookId`    |

## Computing URLs

Every leaf route has an `.href()` method that produces a typed URL string:

```ts
routes.home.href()
// '/'

routes.blog.show.href({ slug: 'hello-remix' })
// '/blog/hello-remix'

routes.admin.books.show.href({ bookId: '42' })
// '/admin/books/42'
```

Missing params or extras are compile-time errors.
