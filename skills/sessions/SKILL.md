---
name: remix-sessions
description: Sessions in Remix v3 — the Session interface, session() middleware setup, choosing a storage backend (cookie, filesystem, memory, redis, memcache), reading/writing keys, flash messages, and how sessions integrate with auth. Load when the user is configuring sessions, storing per-user state, adding flash messages, or debugging session persistence.
---

# Sessions

Sessions wrap a signed cookie around per-user state. The `remix/session` package defines the `Session` interface and a set of storage backends; `remix/session-middleware` glues them onto requests.

## Imports

```ts
import { Session } from 'remix/session'
import { createCookieSessionStorage } from 'remix/session/cookie-storage'
import { createMemorySessionStorage }  from 'remix/session/memory-storage'
import { createFsSessionStorage }      from 'remix/session/fs-storage'
import { createRedisSessionStorage }   from 'remix/session/redis-storage'
import { session } from 'remix/session-middleware'
import { createCookie } from 'remix/cookie'
```

## Pick a storage backend

| Backend          | When to use                                                          |
|------------------|----------------------------------------------------------------------|
| Cookie           | Default. State fits comfortably under 4 KB. No server-side store.    |
| Memory           | Tests and dev. Lost on restart.                                      |
| Filesystem       | Single-node prod with no cache layer.                                |
| Redis / Memcache | Multi-node prod, sticky sessions undesirable.                        |

```ts
// Cookie storage — state lives in the encrypted cookie itself
const sessionStorage = createCookieSessionStorage()

// Redis storage — cookie holds only an opaque session ID
const sessionStorage = createRedisSessionStorage({ url: process.env.REDIS_URL })
```

## Wire it up

```ts
// app/router.ts
const sessionCookie = createCookie('__session', {
  secrets:  [process.env.SESSION_SECRET!],   // required
  httpOnly: true,
  secure:   true,
  sameSite: 'lax',
})

const sessionStorage = createCookieSessionStorage()

export const router = createRouter({
  middleware: [
    session(sessionCookie, sessionStorage),
  ],
})
```

The middleware:
- Parses the cookie on the way in and exposes `context.get(Session)`.
- On the way out, serializes the session to a `Set-Cookie` header if it was mutated.

## Read & write in actions

```ts
import { Session } from 'remix/session'

actions: {
  index({ get }) {
    const session = get(Session)
    const count = Number(session.get('count') ?? 0) + 1
    session.set('count', count)
    return new Response(`Count: ${count}`)
  },
}
```

Common operations:

```ts
session.get(key)        // T | undefined
session.set(key, value) // mark mutated
session.unset(key)
session.has(key)        // boolean
session.flash(key, v)   // one-shot: consumed on the next read
session.id              // current session ID
session.destroy()       // clears cookie at response time
```

## Flash messages

Flash values are read once and then discarded automatically — perfect for one-shot errors and toast banners after a redirect.

```ts
// login action — on failure
session.flash('error', 'Invalid credentials')
return redirect(routes.auth.login.index.href())

// login view — picked up exactly once
const error = session.get('error')   // also unsets it
```

## Session-ID rotation

After authentication, always rotate the ID to defeat session-fixation attacks. The auth helper does this:

```ts
import { completeAuth } from 'remix/auth'

const session = completeAuth(context)   // rotates session.id
session.set('auth', { userId: user.id, … })
```

## Typing the payload

Use a type-only declaration on the session payload to get autocomplete in actions:

```ts
type AppSession = {
  count: number
  auth:  { userId: number; loginMethod: string }
}

const session = get(Session) as Session<AppSession>
session.set('count', 1)   // typed
```

## Choosing the cookie name & secrets

- Set `secrets` to an array. The first secret signs new cookies; the others remain valid for verification. Rotate by *prepending* a new secret.
- Use `secure: true` in production. Set `secure: false` for local HTTP in dev.
- `sameSite: 'lax'` is a safe default for top-level navigation flows.

## Further reading

- `references/storage-backends.md` — cookie, memory, fs, redis, memcache trade-offs and configs
- `references/flash-and-rotation.md` — flash semantics, session-fixation hardening
- See also: [cookies](../cookies/SKILL.md), [auth](../auth/SKILL.md)
