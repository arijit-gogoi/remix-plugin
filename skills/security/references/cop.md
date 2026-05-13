# Cross-Origin Protection (COP) — full reference

`remix/cop-middleware` is a tokenless CSRF defence based on browser provenance headers (`Sec-Fetch-Site` first, `Origin` as fallback). It mirrors Go's `CrossOriginProtection`.

Use it instead of `csrf()` when your deployment satisfies all of:
- Browser-only callers (no native apps, CLIs, or webhooks posting state-changing requests)
- All session/auth cookies are `SameSite=Lax` or stricter
- No state-changing routes accept `GET`

If any of those assumptions break, prefer `csrf()` — or layer both.

## Imports

```ts
import {
  cop,
  type CopOptions,
  type CopFailureReason,
  type CopDenyHandler,
} from 'remix/cop-middleware'
```

## `cop(options?): Middleware`

```ts
const router = createRouter({
  middleware: [cop()],
})
```

No session, no form parsing, no setup. Just install.

## How it decides

For unsafe methods (`POST`/`PUT`/`PATCH`/`DELETE`):

| Signal | Decision |
|---|---|
| `Sec-Fetch-Site: same-origin` | Allow |
| `Sec-Fetch-Site: none` | Allow (top-level nav or browser address bar) |
| `Sec-Fetch-Site: same-site` / `cross-site` | Reject (unless trusted/bypass) |
| No `Sec-Fetch-Site`, `Origin` matches request host | Allow |
| No `Sec-Fetch-Site`, `Origin` differs | Reject (unless trusted/bypass) |
| No `Sec-Fetch-Site`, no `Origin` | **Allow** (older clients / non-browser) |

The last row is intentional but a known trade-off. If non-browser callers shouldn't be able to POST without a token, use `csrf({ allowMissingOrigin: false })` instead.

## `CopOptions`

| Option                  | Type                                | Notes |
|------------------------|-------------------------------------|-------|
| `trustedOrigins`        | `readonly string[]`                  | Exact origins (e.g. `'https://partner.example.com'`) that bypass cross-origin rejection. |
| `insecureBypassPatterns`| `readonly string[]`                  | URL path patterns that skip protection entirely. **Use sparingly** — for webhooks and similar that don't go through browsers. |
| `onDeny`                | `(reason, ctx) => Response`          | Custom rejection response. Default is 403 plain text. |

## Trusted origins

```ts
cop({
  trustedOrigins: [
    'https://embedded.partner.test',
    'https://admin.example.com',
  ],
})
```

These are exact origins, not patterns. If you need regex, you'll need to wrap `cop()` yourself.

## Insecure bypass

For endpoints that explicitly don't need CSRF protection (typically webhooks signed by the sender), list the path patterns:

```ts
cop({
  insecureBypassPatterns: [
    '/webhooks/stripe',
    '/webhooks/github',
  ],
})
```

The bypass disables COP for matching paths. The endpoint should validate the request authenticity itself (HMAC, OAuth signature, IP allowlist).

## Custom error response

```ts
cop({
  onDeny(reason, ctx) {
    metrics.increment('cop.reject', { reason })
    if (reason === 'cross-origin-request-from-old-browser') {
      // Old browser with no Sec-Fetch-Site; the request had a mismatched Origin.
      return new Response('Please update your browser', { status: 403 })
    }
    return new Response('Cross-origin request rejected', { status: 403 })
  },
})
```

`CopFailureReason = 'cross-origin-request' | 'cross-origin-request-from-old-browser'`.

## Layering with `csrf()`

```ts
createRouter({
  middleware: [
    session(sessionCookie, sessionStorage),
    cop(),                              // fast reject before session work
    formData({}),
    csrf(),
  ],
})
```

`cop()` rejects obvious cross-origin attacks early (cheap — no session lookup, no token comparison). `csrf()` covers the cases `cop()` can't be sure about and provides defence-in-depth.

## Common mistakes

- **Placing `cop()` after auth/database loaders.** It's defensive — put it early so rejects are cheap.
- **Adding webhook paths to `trustedOrigins` instead of `insecureBypassPatterns`.** `trustedOrigins` matches the request `Origin` header (which webhooks usually don't send). Use bypass patterns instead.
- **Assuming `cop()` covers non-browser CSRF.** It doesn't — `Origin`/`Sec-Fetch-Site` are browser headers. CLI tools and native apps can omit them entirely and get through. Use `csrf({ allowMissingOrigin: false })` if that's a concern.
