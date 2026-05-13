# Cookie Options Reference

```ts
createCookie(name: string, options: CookieOptions)
```

## `CookieOptions`

| Option       | Type                                   | Default     | Effect                                                                 |
|--------------|----------------------------------------|-------------|------------------------------------------------------------------------|
| `secrets`    | `string[]`                              | `[]`        | HMAC keys. First entry signs; the rest verify. Required for signed cookies. |
| `httpOnly`   | `boolean`                               | `false`     | Hides from JavaScript. Always `true` for session/auth cookies.         |
| `secure`     | `boolean`                               | `false`     | HTTPS only. `true` in prod.                                            |
| `sameSite`   | `'strict' \| 'lax' \| 'none'`           | `'lax'`     | `'none'` requires `secure: true`. Browsers reject otherwise.            |
| `path`       | `string`                                | `'/'`       | Cookie scope by path prefix.                                            |
| `domain`     | `string`                                | host        | Cross-subdomain sharing. Don't set unless you need it.                  |
| `maxAge`     | `number` (seconds)                      | none        | Absolute lifetime. Omit for a session cookie.                          |
| `expires`    | `Date`                                  | none        | Alternative to `maxAge`.                                               |
| `priority`   | `'low' \| 'medium' \| 'high'`           | none        | Chrome-only browser hint for eviction order.                            |
| `partitioned`| `boolean`                               | `false`     | CHIPS — partition by top-level site. For third-party cookie scenarios.  |

## Notes per option

### `secrets`

```ts
createCookie('s', { secrets: [NEW, OLD] })
```

Prepend new secrets to rotate. The cookie is verified against all entries on parse; signed with `secrets[0]` on serialize.

### `httpOnly`

Lets the browser keep the cookie, but JavaScript on the page can't read it via `document.cookie`. Prevents XSS exfiltration. Always on for auth/session.

### `secure` and local dev

`secure: true` over `http://localhost` makes the browser silently drop the cookie. Use:

```ts
secure: process.env.NODE_ENV === 'production',
```

…or run dev under `https://` (mkcert).

### `sameSite`

| Value     | Sent on cross-site requests?                                |
|-----------|--------------------------------------------------------------|
| `strict`  | Never                                                        |
| `lax`     | Top-level navigation (link clicks), not iframes/XHR/forms    |
| `none`    | Always (requires `secure: true`)                              |

`'lax'` is the safe default. Use `'none'` only when you genuinely need third-party embedding (rare).

### `maxAge` vs `expires`

`maxAge` is relative (seconds from now); `expires` is absolute. The framework serialises whichever you provide. If both are set, `maxAge` wins per RFC.

### Clearing a cookie

```ts
const setCookie = await cookie.serialize('', { maxAge: 0 })
return new Response('', { headers: { 'Set-Cookie': setCookie } })
```

`maxAge: 0` immediately expires the cookie.
