# Credentials Auth — email + password done right

Credentials auth is supported via `createCredentialsAuthProvider`. The provider tells `verifyCredentials()` how to parse the incoming form and how to verify the result against your user store.

## Password hashing

Use a memory-hard algorithm — argon2id or bcrypt — never SHA*. Recommended setup with `argon2`:

```ts
// app/utils/password-hash.ts
import argon2 from 'argon2'

export function hashPassword(plain: string) {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 19 * 1024,
    timeCost: 2,
    parallelism: 1,
  })
}

export function verifyPassword(plain: string, hash: string) {
  return argon2.verify(hash, plain)
}
```

If `argon2` isn't an option, `@node-rs/bcrypt` is a fast pure-Rust fallback.

## The provider

```ts
import { createCredentialsAuthProvider } from 'remix/auth'
import { Database } from 'remix/data-table'
import { users } from '../data/schema.ts'
import { verifyPassword } from '../utils/password-hash.ts'

export const passwordProvider = createCredentialsAuthProvider({
  async parse(formData) {
    return {
      email:    String(formData.get('email')    ?? '').toLowerCase(),
      password: String(formData.get('password') ?? ''),
    }
  },
  async verify({ email, password }, context) {
    const db = context.get(Database)
    const user = await db.findOne(users, { where: { email } })
    if (!user) {
      // Run a dummy verify to keep timing constant — no user enumeration
      await verifyPassword(password, DUMMY_HASH)
      return null
    }
    return (await verifyPassword(password, user.password_hash)) ? user : null
  },
})
```

The dummy-hash trick keeps the response time roughly the same whether the email exists or not — denies password-spray attackers a side-channel.

## The login action

```ts
import { verifyCredentials, completeAuth } from 'remix/auth'
import { Session } from 'remix/session'

export async function login(context: AppContext) {
  try {
    const user = await verifyCredentials(passwordProvider, context)
    const session = completeAuth(context)               // rotate session id
    session.set('auth', { userId: user.id, loginMethod: 'credentials' })
    return redirect(routes.account.index.href())
  } catch {
    const session = context.get(Session)
    session.flash('error', 'Invalid email or password')
    return redirect(routes.auth.login.index.href())
  }
}
```

## Rate limiting

`verifyCredentials` doesn't include a rate limiter — wire one in as middleware. A simple in-memory limiter (per IP) for the login endpoint:

```ts
const attempts = new Map<string, { count: number; resetAt: number }>()

export function loginRateLimit(): Middleware {
  return async (ctx, next) => {
    const ip = ctx.request.headers.get('x-forwarded-for') ?? 'unknown'
    const entry = attempts.get(ip) ?? { count: 0, resetAt: Date.now() + 60_000 }
    if (entry.resetAt < Date.now()) { entry.count = 0; entry.resetAt = Date.now() + 60_000 }
    if (entry.count >= 5) return new Response('Too many attempts', { status: 429 })
    attempts.set(ip, { count: entry.count + 1, resetAt: entry.resetAt })
    return next()
  }
}
```

In production, use a real store (Redis) so limits hold across nodes and restarts.

## Account lockout

After N failed attempts in a window, lock the account and require email-based reset. Store `failed_logins_at` and `locked_until` on the user row.
