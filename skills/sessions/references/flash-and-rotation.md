# Flash Messages & Session-ID Rotation

## Flash semantics

`session.flash(key, value)` stores a value that's deleted on the next read. Built for the post-redirect-get pattern: write a flash on failure, redirect to the form page, read it once, show it.

```ts
// in the action
session.flash('error', 'Invalid credentials')
return redirect(routes.auth.login.index.href())
```

```ts
// in the index handler
const error = session.get('error')   // also removes it
return render(<LoginPage error={error} />)
```

Read it via `session.get(key)` — same accessor as regular session values; the `flash` part is only on the write side.

A flash is gone after exactly one read. If you read and discard the value, then read again, the second call returns undefined.

## Session-ID rotation

Rotation = give the user a new session id, copying over the payload. It defeats **session fixation**: an attacker who somehow injects their session cookie into a victim's browser would, after rotation, no longer share the id with the victim.

You rotate after every privilege change — most importantly, login. `completeAuth()` does it automatically:

```ts
import { completeAuth } from 'remix/auth'

async function login(context: AppContext) {
  const user = await verifyCredentials(passwordProvider, context)
  const session = completeAuth(context)         // <-- rotates here
  session.set('auth', { userId: user.id, loginMethod: 'credentials' })
  return redirect(routes.account.index.href())
}
```

Other moments worth rotating:
- After a password change.
- After a privilege escalation (e.g. user becomes admin in the same session).
- After re-authentication (sudo-mode flows).

## Manual rotation

If you're not in an auth flow but still want to rotate:

```ts
const oldSession = get(Session)
const payload = oldSession.toJSON()
oldSession.destroy()
const newSession = createSession(payload)   // creates a fresh id, same data
ctx.set(Session, newSession)
```

This pattern is rarer — usually `completeAuth` covers it.

## Don't store secrets in flash

Flash is for UX (error/success banners, last-edited highlight). Don't put long-lived tokens there — they leak into the next cookie write and live there for the request's lifetime.
