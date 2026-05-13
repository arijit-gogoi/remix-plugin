# Limits & Errors

## Setting limits

```ts
formData({
  uploadHandler,
  maxFileSize:  10 * 1024 * 1024,   // 10 MB per file
  maxFiles:     5,
  maxFieldSize: 64 * 1024,           // 64 KB per non-file field
  maxFields:    100,
  suppressErrors: false,
})
```

Pick limits based on what your endpoint actually accepts. Avatars: 2 MB. Document upload: 10–50 MB. Anything larger: stream multipart yourself via `parseMultipartRequest` and skip `formData()`.

## Error hierarchy

```
FormDataParseError                           ─ base class
├─ MaxFileSizeExceededError                  ─ per-file size cap
├─ MaxFilesExceededError                     ─ total file count cap
├─ MaxFieldSizeExceededError                 ─ per-field size cap (non-file)
└─ MaxFieldsExceededError                    ─ total field count cap
```

All extend `Error`. Multipart-limit errors (`MaxFileSize`/`MaxFiles`) are *not* suppressible — they always bubble even with `suppressErrors: true`.

## Catching errors in a middleware

```ts
import {
  FormDataParseError,
  MaxFileSizeExceededError,
  MaxFilesExceededError,
} from 'remix/form-data-parser'

export function formErrorBoundary(): Middleware {
  return async (_ctx, next) => {
    try {
      return await next()
    } catch (err) {
      if (err instanceof MaxFileSizeExceededError) {
        return new Response('File too large', { status: 413 })
      }
      if (err instanceof MaxFilesExceededError) {
        return new Response('Too many files', { status: 413 })
      }
      if (err instanceof FormDataParseError) {
        return new Response('Bad request', { status: 400 })
      }
      throw err
    }
  }
}
```

Place this above `formData()` so it can catch what `formData()` throws.

## Status code conventions

| Error                          | Status |
|-------------------------------|--------|
| `MaxFileSizeExceededError`    | 413 (Payload Too Large) |
| `MaxFilesExceededError`       | 413                     |
| `MaxFieldSizeExceededError`   | 413                     |
| `MaxFieldsExceededError`      | 413                     |
| Malformed multipart           | 400                     |

## Soft failures via `suppressErrors`

```ts
formData({ uploadHandler, suppressErrors: true })
```

With this on, non-limit parse errors are swallowed and `get(FormData)` returns whatever the parser managed to extract before failing. Use sparingly — usually a malformed body means a buggy client and the right response is 400.

## Pre-flight checks

The browser sends `Content-Length` (when known) before the body. A middleware can short-circuit truly huge requests before parsing even begins:

```ts
export function maxBodyLength(maxBytes: number): Middleware {
  return (ctx, next) => {
    const len = Number(ctx.request.headers.get('content-length') ?? 0)
    if (len > maxBytes) return new Response('Payload too large', { status: 413 })
    return next()
  }
}
```

Place this *above* `formData()`.

## Per-route limits

The global `formData({...})` applies to every request. If one endpoint needs different limits, either:

1. Skip the global middleware for that route and call `parseFormData(request, {...})` inside the handler, or
2. Set the global to the *strictest* policy and run the looser endpoint's parser inline.
