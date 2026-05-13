---
name: remix-auth
description: Authentication in Remix v3 — credentials (email/password) flows, external OAuth/OIDC (Google, GitHub, Okta, Auth0, Microsoft, X, Facebook), the auth() and requireAuth() middleware, createSessionAuthScheme, session-fixation-safe completeAuth(), and how login/logout actions integrate with sessions. Load when the user is building login/signup, adding social providers, protecting routes, or debugging auth flows.
---

# Auth

Authentication is split between `remix/auth` (the primitives for logging users in) and `remix/auth-middleware` (request-time identity resolution and route protection). Providers ship as separate exports — credentials, Google, GitHub, Microsoft, Okta, Auth0, X, Facebook, and a generic OIDC option.

## Imports

```ts
import {
  verifyCredentials,
  startExternalAuth,
  finishExternalAuth,
  completeAuth,
  createCredentialsAuthProvider,
  createGoogleAuthProvider,
  createGitHubAuthProvider,
} from 'remix/auth'

import {
  auth,
  requireAuth,
  createSessionAuthScheme,
  Auth,
} from 'remix/auth-middleware'
```

## Pieces of a complete auth setup

1. A **provider** (or several): credentials, Google, GitHub, …
2. An **auth scheme** that knows how to resolve a `User` from the session (or bearer token).
3. The **`auth()` middleware** that runs the schemes and stores the resolved identity on `context`.
4. The **`requireAuth()` middleware** on protected routes.
5. **`completeAuth()`** at the end of every successful login to rotate the session ID.

## Credentials provider — email + password

```ts
// app/auth/password-provider.ts
import { createCredentialsAuthProvider } from 'remix/auth'
import { Database } from 'remix/data-table'
import { users } from '../data/schema.ts'
import { verifyPassword } from '../utils/password-hash.ts'

export const passwordProvider = createCredentialsAuthProvider({
  async parse(formData) {
    return {
      email:    String(formData.get('email')    ?? ''),
      password: String(formData.get('password') ?? ''),
    }
  },
  async verify({ email, password }, context) {
    const db = context.get(Database)
    const user = await db.findOne(users, { where: { email } })
    if (!user) return null
    return (await verifyPassword(password, user.password_hash)) ? user : null
  },
})
```

The login action:

```ts
// app/controllers/auth/login.ts
export async function login({ get, request }: ActionArgs) {
  const context = /* current context */
  try {
    const user = await verifyCredentials(passwordProvider, context)
    const session = completeAuth(context)
    session.set('auth', { userId: user.id, loginMethod: 'credentials' })
    return redirect(routes.account.index.href())
  } catch {
    const session = get(Session)
    session.flash('error', 'Invalid email or password')
    return redirect(routes.auth.login.index.href())
  }
}
```

`completeAuth()` rotates the session ID — that's the canonical defence against session-fixation attacks. Call it after *every* successful authentication.

## External providers — Google, GitHub, etc.

Two endpoints per provider: a `/login` that redirects to the provider, and a `/callback` that finishes the dance.

```ts
// app/auth/google-provider.ts
import { createGoogleAuthProvider } from 'remix/auth'

export const googleProvider = createGoogleAuthProvider({
  clientId:     process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri:  'https://example.com/auth/google/callback',
  scope:        ['openid', 'email', 'profile'],
})
```

```ts
// app/controllers/auth/google/controller.ts
export default {
  actions: {
    async login({ /* context */ }) {
      return await startExternalAuth(googleProvider, context, {
        returnTo: '/account',
      })
    },
    async callback({ get }) {
      const { result, returnTo } = await finishExternalAuth(googleProvider, context)
      const db = get(Database)

      const authAccount = await upsertGoogleAccount(db, result)
      const user = await db.find(users, authAccount.user_id)
      if (!user) return new Response('User missing', { status: 500 })

      const session = completeAuth(context)
      session.set('auth', {
        userId:         user.id,
        loginMethod:    result.provider,
        authAccountId:  authAccount.id,
      })
      return redirect(returnTo ?? routes.account.index.href())
    },
  },
}
```

## Session auth scheme — wiring identity into requests

A scheme tells `auth()` how to turn a session payload into a `User`:

```ts
// app/middleware/auth.ts
import {
  auth,
  createSessionAuthScheme,
} from 'remix/auth-middleware'
import { Database } from 'remix/data-table'
import { users } from '../data/schema.ts'

type AuthSession = { userId: number; loginMethod: string; authAccountId?: number }
function parseAuthSession(raw: unknown): AuthSession | null {
  if (!raw || typeof raw !== 'object') return null
  // … light shape check
  return raw as AuthSession
}

export function loadAuth() {
  return auth({
    schemes: [
      createSessionAuthScheme({
        read(session)              { return parseAuthSession(session.get('auth')) },
        async verify(value, ctx)   {
          const db = ctx.get(Database)
          return (await db.find(users, value.userId)) ?? null
        },
        invalidate(session)        { session.unset('auth') },
      }),
    ],
  })
}
```

## Mount in the router

```ts
// app/router.ts
import { createRouter } from 'remix/fetch-router'
import { session } from 'remix/session-middleware'
import { loadAuth } from './middleware/auth.ts'
import { loadDatabase } from './middleware/database.ts'
import { requireAuth } from 'remix/auth-middleware'

export const router = createRouter({
  middleware: [
    session(sessionCookie, sessionStorage),  // must come before loadAuth
    loadDatabase(),
    loadAuth(),
  ],
})

router.map(routes.account, {
  middleware: [requireAuth()],
  actions:    accountActions,
})
```

`requireAuth()` returns a redirect or 401 if `context.get(Auth)` is unauthenticated. Stack it on any protected sub-tree.

## Reading the current user in actions

```ts
import { Auth } from 'remix/auth-middleware'

actions: {
  index({ get }) {
    const auth = get(Auth)
    if (auth.kind === 'authenticated') {
      // auth.user is your application User
    }
    // …
  },
}
```

## Logging out

```ts
async logout({ get }) {
  const session = get(Session)
  session.unset('auth')
  return redirect(routes.home.href())
}
```

For OAuth providers that support a remote signout endpoint, call it before clearing the session.

## Bearer-token / API scheme

`auth()` accepts multiple schemes — add a `createBearerAuthScheme(...)` for an API alongside the session scheme for the web UI. The middleware tries each scheme in order and stops at the first success.

## Further reading

- `references/credentials.md` — building robust password verification (hashing, rate-limit hooks)
- `references/oauth-providers.md` — config for Google, GitHub, Microsoft, Okta, Auth0, X, Facebook, generic OIDC
- `references/protecting-routes.md` — `requireAuth()`, role checks, nested controller middleware
- See also: [sessions](../sessions/SKILL.md), [cookies](../cookies/SKILL.md)
