# CORS — full reference

`remix/cors-middleware` adds standard CORS response headers and handles preflight (`OPTIONS`) requests. Use it when your API needs to be readable by browser JavaScript at a different origin.

Note: CORS is *permissive*, not *defensive*. It tells browsers "this other origin is allowed to read my responses." Without CORS, the browser blocks the cross-origin read on the *client* side. CORS does not protect your server from anyone — it lifts a browser-only restriction.

## Imports

```ts
import {
  cors,
  type CorsOptions,
  type CorsOrigin,
  type CorsOriginResolver,
  type CorsAllowedHeadersResolver,
} from 'remix/cors-middleware'
```

## `cors(options?): Middleware`

```ts
const router = createRouter({
  middleware: [
    cors({
      origin: ['https://app.example.com'],
      credentials: true,
      exposedHeaders: ['X-Request-Id'],
    }),
  ],
})
```

Put `cors()` **first** in the stack — preflight requests should short-circuit before going through session/auth/etc.

## `CorsOptions`

| Option              | Type                                                    | Default | Notes |
|---------------------|---------------------------------------------------------|---------|-------|
| `origin`            | `'*' \| string \| RegExp \| Array<…> \| boolean \| (origin, ctx) => …` | `'*'` | See below. |
| `methods`           | `readonly string[]`                                     | `['GET','HEAD','PUT','PATCH','POST','DELETE']` | Sent in `Access-Control-Allow-Methods` on preflights. |
| `allowedHeaders`    | `readonly string[] \| CorsAllowedHeadersResolver`        | (reflects `Access-Control-Request-Headers`) | Which client headers are permitted. |
| `exposedHeaders`    | `readonly string[]`                                     | none    | Which response headers JS callers can read. |
| `credentials`       | `boolean`                                               | `false` | Adds `Access-Control-Allow-Credentials: true`. |
| `maxAge`            | `number`                                                | none    | Preflight cache lifetime (seconds). |
| `preflightContinue` | `boolean`                                               | `false` | If `true`, `OPTIONS` requests fall through to downstream handlers. |

## `origin` shapes

```ts
cors({ origin: '*' })                                    // any origin (no credentials)
cors({ origin: 'https://app.example.com' })              // one exact origin
cors({ origin: /^https:\/\/.*\.example\.com$/ })         // regex
cors({ origin: ['https://a.test', 'https://b.test'] })   // any-of
cors({ origin: [/admin/, 'https://app.example.com'] })   // mixed
cors({ origin: true })                                   // reflect Origin header
cors({                                                    // dynamic — per-tenant, etc.
  origin: async (origin, ctx) => {
    const tenant = ctx.get(Tenant)
    return tenant.allowed_origins.includes(origin)
  },
})
```

Return values from the resolver:
- `'*'` — allow any origin
- `string` — allow that exact origin
- `true` — reflect the request `Origin`
- `false` / `null` / `undefined` — disallow

## Credentials

To allow cookies, `Authorization` headers, or client TLS certs on cross-origin requests, set `credentials: true`. **You cannot combine `credentials: true` with `origin: '*'`** — browsers reject that. Use specific origins or `origin: true` (reflect).

```ts
cors({
  origin: ['https://app.example.com'],
  credentials: true,
})
```

The browser also sends `XMLHttpRequest.withCredentials = true` / `fetch(..., { credentials: 'include' })` on its side.

## Preflight requests

When a browser is about to send a non-simple cross-origin request (custom headers, methods other than GET/HEAD/POST with non-form content type), it first sends an `OPTIONS` preflight. `cors()` handles this automatically and short-circuits with the appropriate headers.

If you want your app to *see* the preflight (rare — for logging, analytics, or per-route policy), set `preflightContinue: true`.

## `allowedHeaders` resolver

By default `cors()` reflects whatever `Access-Control-Request-Headers` the browser sent. To restrict:

```ts
cors({
  allowedHeaders: ['authorization', 'content-type', 'x-csrf-token'],
})
```

Dynamic form:

```ts
cors({
  allowedHeaders: (request, ctx) => {
    return ctx.get(Tenant).api_v2_enabled
      ? ['authorization', 'content-type', 'x-api-version']
      : ['authorization', 'content-type']
  },
})
```

## `exposedHeaders`

By default, browser JS can only read a small set of "CORS-safelisted" response headers (cache-control, content-language, content-type, expires, last-modified, pragma). To expose custom ones:

```ts
cors({
  exposedHeaders: ['X-Request-Id', 'X-Rate-Limit-Remaining'],
})
```

## `maxAge`

How long the browser may cache the preflight response. Reduces preflight chatter:

```ts
cors({ maxAge: 86400 })   // cache preflight for 1 day
```

## Combined with `csrf()`

```ts
createRouter({
  middleware: [
    cors({ origin: ['https://app.example.com'], credentials: true }),
    session(sessionCookie, sessionStorage),
    csrf(),
  ],
})
```

`cors()` handles the preflight and adds response headers; `csrf()` validates the request itself. Both have a job, neither replaces the other.

## Common mistakes

- **`cors({ origin: '*', credentials: true })`** — browsers reject. Specify origins.
- **Placing `cors()` after session/auth.** Preflights then do useless work. Put `cors()` first.
- **Assuming CORS protects your API.** It doesn't. A non-browser client (curl, Python script) can call your API regardless of CORS config. Use proper auth.
- **Forgetting `exposedHeaders`.** JS callers won't be able to read custom response headers without it, even with `origin` set correctly.
