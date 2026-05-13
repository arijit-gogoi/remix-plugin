# Upload Handler Reference

The `uploadHandler` you pass to `formData(...)` is called for *every file part* in a multipart body. Its return value becomes the FormData value for that field.

## `FileUpload` shape

```ts
type FileUpload = File & {
  fieldName: string          // the name="…" attribute of the input
  // and the File interface:
  name: string               // original filename
  type: string               // content-type
  size: number               // bytes (0 if not yet known)
  stream(): ReadableStream<Uint8Array>
  arrayBuffer(): Promise<ArrayBuffer>
  bytes(): Promise<Uint8Array>
  text():  Promise<string>
}
```

## Return values

| Return                 | FormData value                                  |
|------------------------|-------------------------------------------------|
| `null` / `undefined`   | Field is omitted from the FormData               |
| `File` (or File-like)  | That value (typically the result of `storage.set`) |
| `string`               | A plain string value                              |

## Examples

### Drop everything except images

```ts
async function uploadHandler(fileUpload: FileUpload) {
  if (!fileUpload.type.startsWith('image/')) return null
  return await storage.set(crypto.randomUUID(), fileUpload)
}
```

### Per-field policy

```ts
async function uploadHandler(fileUpload: FileUpload) {
  switch (fileUpload.fieldName) {
    case 'avatar':
      if (!fileUpload.type.startsWith('image/')) return null
      if (fileUpload.size > 2 * 1024 * 1024) return null   // 2 MB avatar cap
      return await avatarStorage.set(uuid(), fileUpload)

    case 'attachment':
      return await attachStorage.set(uuid(), fileUpload)

    default:
      return null                                          // ignore unexpected files
  }
}
```

### Tee the stream to virus-scan + storage

```ts
async function uploadHandler(fileUpload: FileUpload) {
  const [forScan, forStore] = fileUpload.stream().tee()

  const ok = await virusScan(forScan)                       // returns boolean
  if (!ok) return null

  const stored = await storage.set(uuid(), {
    name: fileUpload.name,
    type: fileUpload.type,
    size: fileUpload.size,
    stream: () => forStore,
  } as any)
  return stored
}
```

`stream.tee()` is the Web Streams way to read a body twice without buffering.

### Mark as a string instead of storing

Sometimes a "file" field is metadata-only:

```ts
async function uploadHandler(fileUpload: FileUpload) {
  if (fileUpload.fieldName === 'csv_preview') {
    return await fileUpload.text()      // becomes a string in FormData
  }
  return await storage.set(uuid(), fileUpload)
}
```

## Streaming vs buffering

The handler is called *while* the request body is still streaming in. If you call `.arrayBuffer()` or `.bytes()`, you buffer the whole file in memory — defeating the streaming model. Prefer `storage.set(...)` (which consumes the stream lazily) or `.stream()` for custom plumbing.

## Errors inside the handler

A thrown error propagates and aborts parsing. The framework wraps it; you'll see it as a `FormDataParseError` cause chain in the caller. Catch and return `null` (drop the file) if you want soft failures.

## Per-request handlers

The `uploadHandler` passed to global middleware is shared by every request. If you need per-request policy (different limits per user), call `parseFormData(request, { uploadHandler })` from a handler instead of using the global middleware.
