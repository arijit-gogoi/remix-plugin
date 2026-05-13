# Built-in Middleware Reference

Every option for every shipped middleware.

## `logger(options?)`

```ts
import { logger } from 'remix/logger-middleware'

logger({
  format:     'combined' | 'common' | 'tiny' | ((info) => string),
  color:      true | false | 'auto',
  log:        (line: string) => void,        // default: console.log
  skip:       (request: Request) => boolean, // default: never
})
```

Log line includes: method, path, status, duration ms, content-length, user-agent (combined only).

## `compression(options?)`

```ts
import { compression } from 'remix/compression-middleware'

compression({
  level:       6,                              // 1 (fast) – 9 (small)
  threshold:   1024,                            // skip bodies under N bytes
  encodings:   ['br', 'gzip', 'deflate'],       // negotiate in order
  filter:      (request, response) => true,     // skip when false
})
```

`Content-Encoding` is set automatically; existing `Content-Length` is removed (chunked transfer).

## `staticFiles(dir, options?)`

```ts
import { staticFiles } from 'remix/static-middleware'

staticFiles('./public', {
  cacheControl: 'public, max-age=31536000, immutable',
  etag:         true,
  lastModified: true,
  index:        ['index.html'],                  // when path is a dir
  fallthrough:  true,                            // 404 → next middleware
})
```

Place it **early** in the chain so static hits don't go through expensive middleware.

## `formData(options)`

```ts
import { formData } from 'remix/form-data-middleware'

formData({
  uploadHandler,                                 // (fileUpload) => File | null
  maxFileSize:   10 * 1024 * 1024,
  maxFiles:      5,
  maxFieldSize:  100 * 1024,                     // per non-file field
  maxFields:     1000,
  suppressErrors: false,                          // mute non-multipart-limit errors
})
```

Multipart limit violations always throw. Other parse errors can be muted with `suppressErrors`.

## `methodOverride(options?)`

```ts
import { methodOverride } from 'remix/method-override-middleware'

methodOverride({
  field:       '_method',                        // form field name
  header:      'x-http-method-override',         // header name
  methods:     ['PUT', 'PATCH', 'DELETE'],       // allow-list
})
```

Must run **after** `formData()` so the field is already parsed.

## `session(cookie, storage)`

```ts
import { session } from 'remix/session-middleware'

session(sessionCookie, sessionStorage)
```

See [sessions](../../sessions/SKILL.md) for `cookie` and `storage`.

## `asyncContext()`

```ts
import { asyncContext, getContext } from 'remix/async-context-middleware'

asyncContext()
```

No options. After it runs, `getContext()` works anywhere in the call stack for the duration of the request.

## `auth({ schemes })`

```ts
import { auth, createSessionAuthScheme, createBearerAuthScheme } from 'remix/auth-middleware'

auth({
  schemes: [
    createSessionAuthScheme({ read, verify, invalidate }),
    createBearerAuthScheme({ verify }),
  ],
})
```

See [auth](../../auth/SKILL.md).

## `requireAuth(options?)`

```ts
requireAuth({
  redirectTo:   '/auth/login',
  unauthorized: 'redirect' | 'response',
})
```

## Custom: see `references/custom-middleware.md`
