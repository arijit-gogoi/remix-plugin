# Writing Custom Middleware

A middleware is `(context, next) => Response | Promise<Response>`. The contract:

- Call `next()` exactly once to invoke the rest of the chain.
- Return the response (yours or the chain's).
- Anything you `context.set(Key, value)` is visible to downstream actions via `context.get(Key)`.

## Shape

```ts
import type { Middleware } from 'remix/fetch-router'

export function myMiddleware(opts?: …): Middleware {
  return async (ctx, next) => {
    // Pre-processing
    ctx.set(SomeKey, someValue)

    const response = await next()

    // Post-processing
    response.headers.set('X-Foo', 'bar')

    return response
  }
}
```

## Pattern: inject a value into context

```ts
import { Key, type Middleware } from 'remix/fetch-router'

export const RequestId = Key<string>('RequestId')

export function withRequestId(): Middleware {
  return (ctx, next) => {
    ctx.set(RequestId, crypto.randomUUID())
    return next()
  }
}
```

Use it in an action: `const id = get(RequestId)`.

## Pattern: short-circuit with a response

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

Don't call `next()` — the chain stops here.

## Pattern: post-process headers

```ts
export function securityHeaders(): Middleware {
  return async (_ctx, next) => {
    const response = await next()
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options',        'DENY')
    response.headers.set('Referrer-Policy',        'strict-origin-when-cross-origin')
    return response
  }
}
```

## Pattern: timing + observability

```ts
export function timing(): Middleware {
  return async (ctx, next) => {
    const started = performance.now()
    const response = await next()
    const ms = performance.now() - started
    response.headers.set('Server-Timing', `app;dur=${ms.toFixed(1)}`)
    metrics.timing('http.request_ms', ms, {
      path:   ctx.url.pathname,
      status: response.status,
    })
    return response
  }
}
```

## Pattern: load per-request scoped data

```ts
export function loadCurrentTenant(): Middleware {
  return async (ctx, next) => {
    const subdomain = ctx.url.host.split('.')[0]
    const tenant = await tenantsCache.get(subdomain)
    if (!tenant) return new Response('Unknown tenant', { status: 404 })
    ctx.set(Tenant, tenant)
    return next()
  }
}
```

## Pattern: error boundary

```ts
export function errorBoundary(): Middleware {
  return async (ctx, next) => {
    try {
      return await next()
    } catch (err) {
      if (err instanceof ValidationError) {
        return Response.json({ issues: err.issues }, { status: 400 })
      }
      console.error(err)
      return new Response('Internal Server Error', { status: 500 })
    }
  }
}
```

Place it near the top of the stack so it covers everything below.

## Anti-patterns

- **Multiple `next()` calls.** The chain becomes ambiguous; throw early if you spot this.
- **Awaiting `next()` then ignoring its return.** The returned response is what the framework streams back; you must return *something*.
- **Sharing mutable state between requests.** Each call creates a new context; module-level state is shared. Use it only for caches and pools, never per-request data.
