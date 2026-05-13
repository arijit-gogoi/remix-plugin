---
name: remix-forms
description: Form parsing and file uploads in Remix v3 — the formData() middleware, parseFormData() with custom uploadHandler, multipart-parser internals, file-size and file-count limits, and the FormData on context. Load when wiring forms, handling file uploads, customizing where uploads go, hitting MaxFileSizeExceededError, or building form-driven endpoints.
---

# Forms & Uploads

Form parsing in Remix v3 is streaming-first. The `form-data-parser` package replaces the native `request.formData()` with one that knows how to hand file parts to a custom handler — so a 5 GB upload doesn't have to buffer in memory.

## Imports

```ts
import { parseFormData } from 'remix/form-data-parser'
import { formData }      from 'remix/form-data-middleware'
import type { FileUpload } from 'remix/form-data-parser'
import { createFsFileStorage } from 'remix/file-storage/fs'
```

## The middleware path (most apps)

Add `formData()` to the global stack. It parses the body and exposes the result on the context as `FormData`.

```ts
const fileStorage = createFsFileStorage('./tmp/uploads')

const uploadHandler = async (fileUpload: FileUpload) => {
  // Pick a key, store the file, return the value that lives in FormData
  const key = `${crypto.randomUUID()}-${fileUpload.name}`
  const stored = await fileStorage.set(key, fileUpload)
  return stored      // becomes the FormData value for this field
}

const router = createRouter({
  middleware: [
    formData({
      uploadHandler,
      maxFileSize: 10 * 1024 * 1024,   // 10 MB per file
      maxFiles: 5,
    }),
  ],
})
```

In any action:

```ts
async create({ get }) {
  const formData = get(FormData)
  const title   = String(formData.get('title') ?? '')
  const cover   = formData.get('cover')         // File | null (from uploadHandler)
  // …
}
```

## `<form enctype="multipart/form-data">`

```tsx
<form method="post" action="/admin/books" encType="multipart/form-data">
  <input name="title" />
  <input name="cover" type="file" />
  <button type="submit">Create</button>
</form>
```

When the body is `application/x-www-form-urlencoded`, `formData()` parses it natively. When it's `multipart/form-data`, it streams through `multipart-parser` and routes each file part through your `uploadHandler`.

## `uploadHandler` shape

```ts
import type { FileUpload } from 'remix/form-data-parser'

async function uploadHandler(fileUpload: FileUpload) {
  // fileUpload is a File-like stream with:
  //   .fieldName   — the form field name
  //   .name        — original filename
  //   .type        — content type
  //   .size        — bytes (when known)
  //   .stream()    — ReadableStream<Uint8Array>
  //   .arrayBuffer(), .bytes(), .text()

  if (fileUpload.fieldName !== 'cover') return null   // ignore unexpected files
  if (!fileUpload.type.startsWith('image/')) return null

  const key = `${crypto.randomUUID()}.${fileUpload.name.split('.').pop()}`
  return await fileStorage.set(key, fileUpload)
}
```

Return `null` to drop the file silently. Return a `File`-like object to expose it as the FormData value.

## Limits and errors

| Error                          | Triggered when                                  |
|--------------------------------|------------------------------------------------|
| `MaxFileSizeExceededError`     | A part exceeds `maxFileSize`                   |
| `MaxFilesExceededError`        | More parts than `maxFiles` were submitted      |
| `FormDataParseError` (base)    | Catch-all for malformed multipart input        |

Multipart limit errors are *never* suppressed — they always bubble. Other parse errors can be muted with `formData({ suppressErrors: true })` if you want the request to continue with a partial FormData.

## The non-middleware path — `parseFormData()`

If you want full control inside a handler:

```ts
import { parseFormData } from 'remix/form-data-parser'

async function handle(request: Request) {
  const formData = await parseFormData(request, {
    uploadHandler,
    maxFileSize: 5 * 1024 * 1024,
  })
  // … use formData as usual
}
```

Useful for one-off endpoints that need different limits than the global stack, or in tests that build a Request by hand.

## Wiring with `methodOverride`

HTML forms only emit GET and POST. To support PUT/PATCH/DELETE, add `methodOverride()` *after* `formData()`:

```ts
middleware.push(formData({ uploadHandler }))
middleware.push(methodOverride())
```

In your form:

```html
<form method="post" action="/account/settings">
  <input type="hidden" name="_method" value="PUT" />
  …
</form>
```

`methodOverride()` reads `_method` from the parsed FormData, which is why it must run after `formData()`.

## Further reading

- `references/upload-handler.md` — full FileUpload shape, streaming patterns, virus-scan hook
- `references/multipart-internals.md` — how `multipart-parser` chunks the stream
- `references/limits-and-errors.md` — error hierarchy and recovery patterns
- See also: [file-storage](../file-storage/SKILL.md)
