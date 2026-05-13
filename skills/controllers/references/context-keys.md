# Context Keys

`get(Key)` reads a value that some middleware put on the context. Keys are unique symbols — referential equality, not string lookup — so the compiler tells you when a key is missing.

## Keys provided by built-in middleware

| Middleware                    | Key                                  | Value                               |
|-------------------------------|--------------------------------------|-------------------------------------|
| `session(cookie, storage)`    | `Session` from `remix/session`        | `Session<T>` — read/write/flash     |
| `auth({ schemes })`           | `Auth` from `remix/auth-middleware`   | `Auth<User>` — current identity     |
| `formData({…})`               | `FormData`                            | The parsed form body                |
| `asyncContext()`              | (none — exposes `getContext()`)       | Use `getContext()` outside actions  |

## Keys you typically add yourself

| Middleware                | Key                                                                  | Value                  |
|---------------------------|----------------------------------------------------------------------|------------------------|
| `loadDatabase()`          | `Database` from `remix/data-table`                                    | the configured `db`     |
| `loadAssetEntry()`        | a project-local `Key<AssetEntry>`                                     | manifest of CSS/JS hashes |
| `loadAuth()`              | uses `Auth` (above)                                                   | —                      |

A custom key:

```ts
import { Key } from 'remix/fetch-router'

export const RequestId = Key<string>('RequestId')
```

In a middleware:

```ts
return (ctx, next) => {
  ctx.set(RequestId, crypto.randomUUID())
  return next()
}
```

In an action:

```ts
const id = get(RequestId)
```

## Missing-key errors

If a middleware that should provide the key isn't installed, `get(Key)` throws at runtime. The fix is in `app/router.ts` — add the middleware. The error message names the missing Key, so it's usually instant to diagnose.
