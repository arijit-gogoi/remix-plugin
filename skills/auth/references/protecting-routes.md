# Protecting Routes

`requireAuth()` is the standard guard. It runs after `auth()` populates `Auth` on the context. If the user is unauthenticated, it returns a redirect (default) or a 401.

## Single-route protection

```ts
router.get(routes.account.index, {
  middleware: [requireAuth()],
  handler:    accountIndex,
})
```

## Whole controller subtree

```ts
router.map(routes.account, {
  middleware: [requireAuth()],     // protects every action and nested controller
  actions: accountActions,
})
```

## Role-based authorisation

`requireAuth()` only verifies identity. For roles, write a project-local `requireAdmin()`:

```ts
import type { Middleware } from 'remix/fetch-router'
import { Auth } from 'remix/auth-middleware'

export function requireAdmin(): Middleware {
  return (ctx, next) => {
    const auth = ctx.get(Auth)
    if (auth.kind !== 'authenticated' || auth.user.role !== 'admin') {
      return new Response('Forbidden', { status: 403 })
    }
    return next()
  }
}
```

Stack it after `requireAuth`:

```ts
router.map(routes.admin, {
  middleware: [requireAuth(), requireAdmin()],
  actions:    adminActions,
})
```

## Options

`requireAuth()` accepts:

| Option        | Default | Notes                                          |
|---------------|---------|------------------------------------------------|
| `redirectTo`  | `/auth/login` | Where to send unauthenticated users          |
| `unauthorized` | `'redirect'` | `'redirect'` or `'response'` (returns 401)   |

For an API:

```ts
router.get('/api/me', {
  middleware: [requireAuth({ unauthorized: 'response' })],
  handler: ({ get }) => Response.json(get(Auth).user),
})
```

## Reading the user in a protected action

```ts
import { Auth } from 'remix/auth-middleware'

actions: {
  index({ get }) {
    const auth = get(Auth)
    // auth.kind === 'authenticated' is guaranteed inside requireAuth
    const user = auth.user
    return render(<AccountPage user={user} />)
  },
}
```

## When *not* to protect

- Login, signup, password-reset pages — must be reachable while logged out.
- Public profile pages, homepage, RSS feeds.
- Webhooks — they use bearer tokens (different auth scheme), not session auth.

Mount these *outside* the protected subtree, or above it in your route layout.

## CSRF

Sessions are signed cookies, but state-changing forms still need CSRF protection in cross-origin scenarios. The framework's `sameSite: 'lax'` cookie default handles top-level navigation. For embedded forms (iframes, third-party POSTs) add a CSRF middleware that compares a hidden form field against a token in the session.
