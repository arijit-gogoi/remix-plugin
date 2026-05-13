---
name: remix-middleware
description: Composing the router middleware stack in Remix v3 — logger, compression, staticFiles, formData, methodOverride, session, asyncContext, plus how middleware ordering affects request handling and how to write a custom middleware that injects values into the request context. Load when the user is editing app/router.ts, debugging request flow, or building a custom middleware (database loader, request ID, request-scoped cache, etc.).
---

# Middleware

`remix/fetch-router` runs middleware in registration order on the way in, and in reverse order on the way back. Anything that decorates the request context, short-circuits with a response, or post-processes the response belongs here.

## Built-in middleware (and their imports)

```ts
import { logger }          from 'remix/logger-middleware'
import { compression }     from 'remix/compression-middleware'
import { staticFiles }     from 'remix/static-middleware'
import { formData }        from 'remix/form-data-middleware'
import { methodOverride }  from 'remix/method-override-middleware'
import { session }         from 'remix/session-middleware'
import { asyncContext, getContext } from 'remix/async-context-middleware'
import { auth, requireAuth } from 'remix/auth-middleware'
```

## A canonical production stack

Order matters. This is the stack used by the official bookstore demo:

```ts
import { createRouter } from 'remix/fetch-router'

const middleware = []

if (process.env.NODE_ENV === 'development') {
  middleware.push(logger())                // 1. observability — first so we time everything
}

middleware.push(compression())             // 2. wraps response in gzip/br

middleware.push(staticFiles('./public', {  // 3. fast-exit for static assets
  cacheControl: 'no-store, must-revalidate',
  etag: false,
  lastModified: false,
}))

middleware.push(formData({ uploadHandler })) // 4. parse multipart bodies
middleware.push(methodOverride())            // 5. promote _method=PUT to PUT — after form parsing
middleware.push(session(cookie, storage))    // 6. load session
middleware.push(asyncContext())              // 7. make context available to deep helpers
middleware.push(loadDatabase())              // 8. attach Database
middleware.push(loadAuth())                  // 9. resolve current user

export const router = createRouter({ middleware })
```

### Why this order

- **`logger` first** — to time the whole request including everything below it.
- **`compression` early** — once response headers are written it's too late.
- **`staticFiles` before any heavy middleware** — `/assets/app.css` shouldn't hit your auth code.
- **`methodOverride` after `formData`** — it reads the `_method` field which comes from the parsed body.
- **`session` before `auth`** — auth schemes read from the session.
- **`asyncContext` before app middleware** — so helpers in the call stack can call `getContext()`.

## Per-route and per-controller middleware

In addition to global middleware, controllers can declare their own:

```ts
router.map(routes.admin, {
  middleware: [requireAuth(), requireAdmin()],
  actions: { /* … */ },
})
```

Inline on a verb route:

```ts
router.post(routes.cart.api.add, {
  middleware: [requireAuth()],
  handler({ get }) { /* … */ },
})
```

Execution order: **global → controller chain (parent → child) → action**.

## Built-in middleware reference (one-liners)

### `logger()`

Logs method, path, status, duration, content length. Pass `{ format: …, color: true }` to customise.

### `compression()`

Compresses text-like responses (gzip / br based on `Accept-Encoding`).

### `staticFiles(dir, options?)`

Serves files from `dir` and exits the chain on a hit. `cacheControl`, `etag`, `lastModified` configure response headers.

### `formData({ uploadHandler, maxFileSize?, maxFiles? })`

Parses `application/x-www-form-urlencoded` and `multipart/form-data`. The parsed `FormData` is on the context (`get(FormData)`). See [forms-uploads](../forms-uploads/SKILL.md) for `uploadHandler`.

### `methodOverride()`

If a form submission has a `_method` field of `PUT`/`PATCH`/`DELETE`, rewrites the request method accordingly. Must run *after* `formData`.

### `session(cookie, storage)`

Loads & saves the session. See [sessions](../sessions/SKILL.md).

### `asyncContext()`

Stores the request context in `AsyncLocalStorage`. Helpers can then call `getContext()` without explicit threading:

```ts
import { getContext } from 'remix/async-context-middleware'

export async function currentUser() {
  return getContext().get(Auth).user
}
```

### `auth({ schemes }) / requireAuth()`

See [auth](../auth/SKILL.md).

## Writing a custom middleware

A middleware is `(context, next) => Promise<Response>`. Anything you `set()` on the context becomes available to downstream actions via `get()`.

```ts
// app/middleware/database.ts
import type { Middleware } from 'remix/fetch-router'
import { Database } from 'remix/data-table'
import { db } from '../data/setup.ts'

export function loadDatabase(): Middleware {
  return (ctx, next) => {
    ctx.set(Database, db)
    return next()
  }
}
```

A short-circuiting middleware:

```ts
export function maintenanceMode(): Middleware {
  return (_ctx, next) => {
    if (process.env.MAINTENANCE === '1') {
      return new Response('Down for maintenance', { status: 503 })
    }
    return next()
  }
}
```

A post-processing middleware:

```ts
export function addRequestId(): Middleware {
  return async (ctx, next) => {
    const requestId = crypto.randomUUID()
    ctx.set(RequestId, requestId)
    const response = await next()
    response.headers.set('X-Request-Id', requestId)
    return response
  }
}
```

## Further reading

- `references/built-ins.md` — full options for every shipped middleware
- `references/custom-middleware.md` — patterns for context keys, short-circuit, post-process
- `references/ordering.md` — common ordering bugs and how to spot them
