# Middleware Ordering — pitfalls and rules of thumb

Middleware runs in registration order on the way in, and in reverse on the way back. Bugs almost always come from one of these mistakes:

## 1. `logger` not at the top

If `logger` comes after `staticFiles`, you never see static-file hits in logs. Put `logger` first when you want everything logged, including 404s and cache hits.

## 2. `compression` after the response is built

Once another middleware reads or writes response headers, gzip middleware further down can no longer set `Content-Encoding`. Compression goes near the top.

## 3. `staticFiles` after auth

```ts
// BAD
middleware.push(loadAuth())
middleware.push(staticFiles('./public'))
```

Now `/assets/app.css` runs through your DB-backed auth scheme. CDN-like throughput evaporates. Move `staticFiles` above any business middleware.

## 4. `methodOverride` before `formData`

`methodOverride` reads `_method` from the parsed body. If the body isn't parsed yet, it sees nothing and silently no-ops.

```ts
middleware.push(formData({ uploadHandler }))
middleware.push(methodOverride())          // ← after formData
```

## 5. `session` after `auth`

`auth` schemes typically read identity from the session. If `session` hasn't run, `auth` always finds no user — every request is anonymous, even valid ones.

```ts
middleware.push(session(cookie, storage))
middleware.push(loadAuth())                // ← after session
```

## 6. `asyncContext` too late

Helpers deep in the call stack use `getContext()` to skip threading the context through every call. If those helpers run during the early phase (e.g. inside `loadDatabase`'s setup), they need `asyncContext` to be installed *before* `loadDatabase`. Put it as high as feasible while still after the "infrastructure" layer.

```ts
middleware.push(session(cookie, storage))
middleware.push(asyncContext())
middleware.push(loadDatabase())            // can use getContext() now
middleware.push(loadAuth())
```

## 7. Custom error boundary not high enough

A error-boundary middleware can only catch errors thrown by middleware *below* it. Put it at or near the top so it covers your routes, your auth, your DB queries, everything.

```ts
middleware.push(errorBoundary())           // catches everything below
middleware.push(logger())
middleware.push(compression())
// …
```

## Canonical ordering

```ts
middleware.push(errorBoundary())            // 0. catch-all
middleware.push(logger())                   // 1. observability
middleware.push(compression())              // 2. response encoding
middleware.push(staticFiles('./public'))    // 3. fast-exit for assets
middleware.push(formData({ uploadHandler }))// 4. parse body
middleware.push(methodOverride())           // 5. PUT/PATCH/DELETE from form
middleware.push(session(cookie, storage))   // 6. load session
middleware.push(asyncContext())             // 7. enable getContext()
middleware.push(loadDatabase())             // 8. attach db
middleware.push(loadAuth())                 // 9. resolve user
```

When in doubt, follow this template.

## Per-controller middleware ordering

When a controller declares its own middleware, those run *after* all global middleware in registration order. Nested controllers stack their middleware on top.

```
global₀ → global₁ → … → controllerParent.mw[0] → controllerParent.mw[1] → controllerChild.mw[0] → action
```

The reverse order applies on the way out.
