---
name: remix-security
description: Cross-origin security in Remix v3 — CSRF protection (`csrf()` synchronizer tokens + origin validation), tokenless cross-origin defence (`cop()` via `Sec-Fetch-Site`/`Origin`), and CORS (`cors()` preflight handling + credentialed responses + allowed origins). Load whenever the user mentions CSRF, XSRF, cross-origin, CORS, `Sec-Fetch-Site`, `Access-Control-Allow-*`, preflight, public API consumed by browsers from another origin, hardening forms, or is about to install csurf / lusca / helmet / cors. Also load when the user asks "do I need CSRF if I have SameSite cookies?" or is deciding between `csrf()` and `cop()`. For session machinery see /remix:sessions; for identity see /remix:auth.
---

# Security

Remix ships three cross-origin / request-provenance middlewares. Pick based on what you're defending and what guarantees your deployment can make:

| Middleware | Defends against | When to use |
|---|---|---|
| `csrf()` | Cross-site form submissions stealing a logged-in user's session | Session-backed HTML forms. The conservative default. |
| `cop()` | Same thing, but tokenless using browser provenance headers | Modern-browser-only deploys, no third-party-embedded forms, no `GET` state changes |
| `cors()` | Browsers blocking your *public API* from being read by other origins | Public JSON APIs consumed by browser JS at other origins |

CSRF and COP are *defensive* — they reject requests. CORS is *permissive* — it tells browsers it's OK to read your responses. They solve opposite problems.

## CSRF — synchronizer tokens + origin checks

```ts
import { csrf, getCsrfToken } from 'remix/csrf-middleware'
import { session } from 'remix/session-middleware'

const router = createRouter({
  middleware: [
    session(sessionCookie, sessionStorage),   // must run before csrf()
    formData({}),                              // if reading tokens from form bodies
    csrf(),
  ],
})
```

Embed the token in any form:

```tsx
function ContactPage(ctx: RequestContext) {
  const token = getCsrfToken(ctx)
  return render(
    <form method="post" action={routes.contact.action.href()}>
      <input type="hidden" name="_csrf" value={token} />
      <input name="email" required />
      <button type="submit">Send</button>
    </form>
  )
}
```

Token lookup order: headers (`x-csrf-token`, `x-xsrf-token`, `csrf-token`) → form field `_csrf` → query param `_csrf`.

Safe methods (`GET`, `HEAD`, `OPTIONS`) bypass the token check. Unsafe methods also get an `Origin`/`Referer` validation step.

See [`references/csrf.md`](./references/csrf.md) for the full `CsrfOptions` surface, custom origin/token resolvers, and the `onError` handler.

## COP — tokenless cross-origin protection

```ts
import { cop } from 'remix/cop-middleware'

createRouter({ middleware: [cop()] })
```

Works by inspecting `Sec-Fetch-Site` first, then `Origin`. No session state, no form-field plumbing. Trade-off: needs modern browsers and same-origin form workflows.

The decision rule:

```
Allow csrf() if:
  - any non-browser clients post forms, OR
  - you need to support cross-origin embedded forms with explicit trust, OR
  - you want server-side audit of who got rejected and why

Allow cop() if:
  - browser-only callers, AND
  - all session cookies are SameSite=Lax (or stricter), AND
  - no state-changing GET endpoints
```

For belt-and-braces, layer both: `cop()` rejects clearly cross-origin requests early, `csrf()` covers the rest.

```ts
createRouter({
  middleware: [
    session(sessionCookie, sessionStorage),
    cop(),
    formData({}),
    csrf(),
  ],
})
```

See [`references/cop.md`](./references/cop.md) for `CopOptions`, trusted-origins config, and bypass patterns.

## CORS — let other origins read your API

```ts
import { cors } from 'remix/cors-middleware'

createRouter({
  middleware: [
    cors({
      origin: ['https://app.example.com', 'https://admin.example.com'],
      credentials: true,
      exposedHeaders: ['X-Request-Id'],
    }),
  ],
})
```

CORS does the opposite of CSRF/COP: it actively *tells* browsers "this origin is allowed to read my responses". Without it, JS at other origins gets a CORS error trying to read JSON your API returned.

| Option | Notes |
|---|---|
| `origin` | `'*'`, exact string, RegExp, array, `true` (reflect), or `(origin, ctx) => boolean \| string` |
| `credentials` | Adds `Access-Control-Allow-Credentials: true` (cannot be combined with `origin: '*'`) |
| `methods` | Defaults to `['GET','HEAD','PUT','PATCH','POST','DELETE']` |
| `allowedHeaders` | Defaults to reflecting `Access-Control-Request-Headers` |
| `exposedHeaders` | Custom response headers JS callers can read |
| `maxAge` | Cache lifetime for preflight responses (seconds) |

See [`references/cors.md`](./references/cors.md) for credentialed-request patterns, dynamic origin resolvers, and the private-network access opt-in.

## CSRF + CORS together (common pattern)

A public API that browsers from other origins can call, AND that uses session cookies for auth:

```ts
createRouter({
  middleware: [
    cors({
      origin: ['https://app.example.com'],
      credentials: true,
    }),
    session(sessionCookie, sessionStorage),
    csrf(),
  ],
})
```

`cors()` runs first so it can answer preflights without going through session/CSRF logic. The actual request then flows through session and CSRF as normal.

## Common pitfalls

- **`session()` must run before `csrf()`.** The token lives in the session. Forgot order → first request throws.
- **`cors({ origin: '*', credentials: true })`** is rejected by browsers. Use specific origins (or `true` to reflect) with credentials.
- **CSRF tokens rotate when the session rotates.** That happens on every `completeAuth()` (i.e. login). Cached form pages with the old token will fail next submit — that's correct behaviour, not a bug.
- **COP allows requests with no `Origin`/`Referer`/`Sec-Fetch-Site` at all.** Older clients and non-browser callers don't fail closed. If that's not acceptable in your threat model, use `csrf()` with `allowMissingOrigin: false`.
- **CORS preflight + custom middleware ordering.** `cors()` short-circuits `OPTIONS` requests by default — anything that needs to see preflights should set `preflightContinue: true`.

## Further reading

- [`references/csrf.md`](./references/csrf.md) — full `CsrfOptions`, resolvers, error handling, JS/XHR patterns
- [`references/cop.md`](./references/cop.md) — `CopOptions`, trusted origins, bypass patterns, threat model
- [`references/cors.md`](./references/cors.md) — full `CorsOptions`, credentialed requests, dynamic origins
- See also: [auth](../auth/SKILL.md) (identity), [sessions](../sessions/SKILL.md) (session-fixation defence)
