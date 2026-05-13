---
name: remix-routing
description: Routing in Remix v3 — how to define typed route maps with route(), form(), resources(), and verb helpers (get, post, put, del), how URL params are extracted, how nested routes compose, and how the central app/routes.ts contract drives the rest of the app. Load when the user is editing app/routes.ts, defining new URLs, organizing nested routes, building RESTful resources, or asking how a request finds its handler.
---

# Routing

Remix v3 has a single typed route map per app, conventionally at `app/routes.ts`. The map is built with helpers from `remix/routes` and then bound to controllers by `router.map()` in `app/router.ts`. The shape of the route map is the type-level contract of the app.

## Imports

```ts
import { route, form, resources, get, post, put, del } from 'remix/fetch-router/routes'
import { createRouter } from 'remix/fetch-router'
```

## `route()` — build a route map

`route()` accepts either a plain string pattern or an object of nested entries. Nesting is unlimited.

```ts
export const routes = route({
  home: '/',
  about: '/about',
  search: '/search',
  blog: {
    index: '/blog',
    show: '/blog/:slug',
  },
})
// Types you get for free:
//   routes.home        : Route<'ANY', '/'>
//   routes.blog.show   : Route<'ANY', '/blog/:slug'>
```

The colon prefix marks a parameter (`:slug`, `:userId`). Params flow into the controller as a typed `params` object.

## Verb helpers — pin a method

By default a route accepts any method. To pin GET, POST, PUT, DELETE, use the verb helpers:

```ts
import { get, post, put, del } from 'remix/fetch-router/routes'

const apiRoutes = route('api', {
  health:    get('/health'),
  createBook: post('/books'),
  updateBook: put('/books/:id'),
  deleteBook: del('/books/:id'),
})
```

## `form()` — one URL, GET + POST

`form()` (also exported as `createFormRoutes`) creates an `index` (GET, to show the form) and an `action` (POST, to handle submission) at the same URL. The classic progressive-enhancement HTML form pattern.

```ts
const routes = route({
  contact: form('contact'),
  // → contact.index  : GET  /contact
  // → contact.action : POST /contact
})
```

Override the method (e.g. for PUT settings forms):

```ts
settings: form('settings', {
  formMethod: 'PUT',
  names: { action: 'update' },
})
```

## `resources()` — RESTful CRUD

`resources()` generates the seven standard REST actions: `index`, `new`, `create`, `show`, `edit`, `update`, `destroy`. Trim with `only` / `except`, and rename the URL param.

```ts
admin: route('admin', {
  books:  resources('books',  { param: 'bookId' }),
  users:  resources('users',  { only: ['index', 'show', 'edit', 'update', 'destroy'], param: 'userId' }),
  orders: resources('orders', { only: ['index', 'show'], param: 'orderId' }),
})
```

This generates URLs like `GET /admin/books`, `POST /admin/books`, `GET /admin/books/:bookId`, `PUT /admin/books/:bookId`, etc.

## A realistic top-level `routes.ts`

```ts
import { del, form, get, post, put, resources, route } from 'remix/fetch-router/routes'

export const routes = route({
  assets:    '/assets/*path',
  uploads:   '/uploads/*key',

  home:    '/',
  about:   '/about',
  contact: form('contact'),
  search:  '/search',

  books: {
    index: '/books',
    genre: '/books/genre/:genre',
    show:  '/books/:slug',
  },

  auth: {
    login:          form('login'),
    register:       form('register'),
    logout:         post('logout'),
    forgotPassword: form('forgot-password'),
    resetPassword:  form('reset-password/:token'),
  },

  account: route('account', {
    index:    '/',
    settings: form('settings', { formMethod: 'PUT', names: { action: 'update' } }),
    orders:   resources('orders', { only: ['index', 'show'], param: 'orderId' }),
  }),

  admin: route('admin', {
    index:  get('/'),
    books:  resources('books', { param: 'bookId' }),
  }),
})
```

## Wiring routes to controllers

In `app/router.ts`:

```ts
import { createRouter } from 'remix/fetch-router'
import { routes } from './routes.ts'
import { home } from './controllers/home.tsx'
import { adminBooks } from './controllers/admin/books/controller.tsx'

export const router = createRouter()

router.map(routes.home, home)
router.map(routes.admin.books, adminBooks)
```

`router.map()` walks the nested route map and expects a matching nested controller shape. The TypeScript compiler enforces that every route has a handler.

## Params & wildcards

| Pattern              | Match                | `params`                  |
|---------------------|----------------------|---------------------------|
| `/blog/:slug`       | `/blog/hello-remix`  | `{ slug: 'hello-remix' }` |
| `/users/:id/posts/:postId` | `/users/42/posts/7` | `{ id: '42', postId: '7' }` |
| `/assets/*path`     | `/assets/img/a.png`  | `{ path: 'img/a.png' }`   |

Wildcards (`*name`) capture the rest of the path.

## Further reading

- `references/route-builders.md` — full API of `route`, `form`, `resources`, `get/post/put/del`
- `references/patterns.md` — pattern syntax (params, wildcards, optional segments, search constraints)
- `references/binding-controllers.md` — `router.map`, `router.get`, inline `handler`/`middleware` shorthand
