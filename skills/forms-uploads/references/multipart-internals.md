# Multipart Internals

`remix/form-data-parser` rides on top of `remix/multipart-parser`, which is the low-level streaming parser. You normally never touch the lower layer — but knowing how it works helps debug edge cases.

## How the parser sees a request

A `multipart/form-data` body looks like:

```
------RemixBoundary123
Content-Disposition: form-data; name="title"

The Pragmatic Programmer
------RemixBoundary123
Content-Disposition: form-data; name="cover"; filename="cover.png"
Content-Type: image/png

<binary bytes>
------RemixBoundary123--
```

The parser:
1. Reads `Content-Type` for the `boundary=…` parameter.
2. Yields one `MultipartPart` per section, with headers and a body stream.
3. The form-data layer wraps each part into a `FormData` entry, calling your `uploadHandler` for parts that have a `filename`.

## Using `parseMultipartRequest` directly

```ts
import { parseMultipartRequest } from 'remix/multipart-parser'

for await (const part of parseMultipartRequest(request)) {
  console.log(part.fieldName, part.filename, part.contentType)
  const text = await part.text()      // or .arrayBuffer() / .bytes() / .stream()
}
```

Useful for non-FormData multipart payloads — e.g. `multipart/related`, `multipart/byteranges`, or custom protocols.

## Limits

| Setting           | Where                          | Default | Notes                                    |
|------------------|--------------------------------|---------|------------------------------------------|
| `maxFileSize`     | `formData({ maxFileSize })`    | none    | Per file. Throws `MaxFileSizeExceededError` |
| `maxFiles`        | `formData({ maxFiles })`       | none    | Total file parts. Throws `MaxFilesExceededError` |
| `maxFieldSize`    | `formData({ maxFieldSize })`   | 100 KB  | Per non-file field                        |
| `maxFields`       | `formData({ maxFields })`      | 1000    | Total fields                              |
| Multipart boundary length | parser-level               | 256 B   | Anti-DoS sanity bound                      |

Limit violations on multipart parts always throw — they are not suppressible.

## Memory characteristics

A streaming pipeline costs roughly:

- The parser's chunk buffer (~16 KB).
- The headers of the current part.
- Whatever the upload handler is holding (zero for `storage.set(...)` streaming, full size for `.arrayBuffer()`).

So a 1 GB upload uses ~16 KB of RAM if the handler streams to disk/S3. Don't blow that with `.arrayBuffer()`.

## Encoding quirks

- `Content-Disposition: filename*=UTF-8''…` (RFC 5987) is decoded. The legacy `filename="…"` also works.
- Some browsers send `filename` with the basename, others with the full path; rely on the server to sanitise (`path.basename`).
- Trailing CRLFs at the end of a part body are stripped by the parser.

## Failure modes & errors

| Error                       | Cause                                              |
|----------------------------|----------------------------------------------------|
| `MaxFileSizeExceededError` | A file part exceeded `maxFileSize`                  |
| `MaxFilesExceededError`    | More file parts than `maxFiles`                     |
| `MaxFieldSizeExceededError` | A non-file field exceeded `maxFieldSize`            |
| `MaxFieldsExceededError`   | More fields than `maxFields`                        |
| `FormDataParseError`       | Base class — malformed multipart, premature EOF    |

All inherit from `FormDataParseError`. Catch the base in an error-boundary middleware to produce a 400.
