# CSRF Middleware — full reference

`remix/csrf-middleware` ships a synchronizer-token CSRF defence plus origin/referer checks for unsafe methods. It requires `session-middleware` to run before it; if you accept tokens from form bodies, `form-data-middleware` must also run before it.

## Imports

```ts
import {
  csrf,
  getCsrfToken,
  type CsrfOptions,
  type CsrfOrigin,
  type CsrfOriginResolver,
  type CsrfTokenResolver,
  type CsrfFailureReason,
} from 'remix/csrf-middleware'
```

## `csrf(options?): Middleware`

```ts
const router = createRouter({
  middleware: [
    session(sessionCookie, sessionStorage),
    formData({}),                       // only if you read tokens from forms
    csrf({ /* options */ }),
  ],
})
```

## `getCsrfToken(context, tokenKey?): string`

Reads the active token from the session, creating one if it's missing. Call this in any action that renders a form.

```ts
const token = getCsrfToken(ctx)
return render(<HiddenInput name="_csrf" value={token} />)
```

## `CsrfOptions`

| Option              | Type                                         | Default                                        | Notes |
|---------------------|----------------------------------------------|------------------------------------------------|-------|
| `tokenKey`          | `string`                                     | `'_csrf'`                                      | Session key for the stored token. |
| `fieldName`         | `string`                                     | `'_csrf'`                                      | Form field name to read tokens from. |
| `headerNames`       | `readonly string[]`                          | `['x-csrf-token', 'x-xsrf-token', 'csrf-token']` | Headers checked in order. |
| `safeMethods`       | `readonly RequestMethod[]`                   | `['GET', 'HEAD', 'OPTIONS']`                   | Methods that skip validation. |
| `origin`            | `string \| RegExp \| Array<…> \| CsrfOriginResolver` | (same-origin only)                       | Allowed cross-origin sources. |
| `allowMissingOrigin`| `boolean`                                    | `true`                                         | Allow unsafe requests when no `Origin`/`Referer`. |
| `value`             | `CsrfTokenResolver`                          | (built-in)                                     | Custom token extractor. |
| `onError`           | `(reason, ctx) => Response`                  | 403 plain text                                 | Custom failure response. |

## Failure reasons

`CsrfFailureReason = 'invalid-origin' | 'missing-token' | 'invalid-token'`

In a custom `onError`:

```ts
csrf({
  onError(reason, ctx) {
    if (reason === 'invalid-origin') {
      return new Response('Cross-origin form submissions are not allowed', { status: 403 })
    }
    return new Response(`CSRF check failed: ${reason}`, { status: 403 })
  },
})
```

## Origin resolvers

The `origin` option accepts four forms:

```ts
// 1. Single string — exact match
csrf({ origin: 'https://partner.example.com' })

// 2. Regex — pattern match
csrf({ origin: /^https:\/\/.*\.partner\.test$/ })

// 3. Array — any-of, mixing strings and regexes
csrf({ origin: ['https://app.example.com', /^https:\/\/.*\.staging\.test$/] })

// 4. Function — dynamic, can read context (e.g. tenant lookup)
csrf({
  origin: async (origin, ctx) => {
    const tenant = ctx.get(Tenant)
    return tenant.allowed_origins.includes(origin)
  },
})
```

Return `true` to allow, `false` to reject, `null`/`undefined` to fall through to the default same-origin check.

## Custom token resolvers

The default lookup order is: headers → form field → query param. If you have a non-standard transport (e.g. a custom header or a JWT-embedded token), pass a `value` function:

```ts
csrf({
  value: (ctx) => ctx.request.headers.get('x-my-custom-token') ?? null,
})
```

Return `null` to mean "no token submitted" — `csrf()` will then reject with `missing-token`.

## Forms with the standard transport

```tsx
function ContactPage(ctx: RequestContext) {
  const token = getCsrfToken(ctx)
  return render(
    <form method="post" action={routes.contact.action.href()}>
      <input type="hidden" name="_csrf" value={token} />
      <input name="email" type="email" required />
      <textarea name="message" required />
      <button type="submit">Send</button>
    </form>
  )
}
```

The token rotates per session; once the user logs in (which rotates the session id via `completeAuth()`), the token also rotates. Embedded forms that were cached with the old token will fail the next submit — that's the right behaviour.

## XHR / fetch from same-origin pages

For JS-driven forms, send the token as a header. Read it from a meta tag or from a JSON endpoint:

```tsx
<meta name="csrf-token" content={getCsrfToken(ctx)} />
```

```ts
const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
await fetch('/api/save', {
  method: 'POST',
  headers: { 'x-csrf-token': token, 'content-type': 'application/json' },
  body: JSON.stringify(payload),
})
```

## Tokenless alternative — `cop-middleware`

If your deployment satisfies all of:

- All session/auth cookies are `SameSite=Lax` (or stricter).
- No state-changing routes accept `GET`.
- You don't embed forms cross-site.
- Browsers reaching your site can be expected to send `Sec-Fetch-Site` and friends.

…then `cop()` ("Cross-Origin Protection") is enough — it uses browser provenance headers instead of synchronizer tokens. No session state, no form-field plumbing.

```ts
import { cop } from 'remix/cop-middleware'

createRouter({ middleware: [cop()] })
```

This is the model Go's net/http has adopted. `csrf()` remains the conservative default; reach for `cop()` only when the trade-off is intentional.

## Layering `cop()` in front of `csrf()`

For belt-and-braces:

```ts
createRouter({
  middleware: [
    session(sessionCookie, sessionStorage),
    cop(),                                  // fast cross-origin reject
    formData({}),
    csrf(),                                 // synchronizer-token validation
  ],
})
```

`cop()` rejects clearly cross-origin requests early (cheap); `csrf()` covers the cases `cop()` can't be sure about.

## Common mistakes

- **Forgetting `session()` before `csrf()`.** The middleware needs the session to store the token. It'll throw on first request.
- **Reading the token from `request.formData()` directly.** Once `formData()` middleware ran, the body is already consumed. Use `ctx.get(FormData)` if you need to inspect form fields manually — but normally `csrf()` reads the token for you.
- **Embedding tokens in URLs that get shared.** Query-param tokens leak into logs, bookmarks, and the clipboard. Prefer headers or hidden form inputs.
- **Forgetting to rotate the cookie when a token is stolen.** If you've ever logged "CSRF token X was leaked", treat the entire session as compromised — `session.destroy()` and force re-auth.
