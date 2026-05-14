---
name: remix-utilities
description: Reference card for the smaller utility packages Remix v3 bundles — `remix/mime` (`detectContentType` from filename, `isCompressibleMimeType`, `defineMimeType`), `remix/lazy-file` (`LazyFile` / `LazyBlob` — File-shaped objects that defer reading), `remix/fs` (`openLazyFile`, `writeFile` returning `LazyFile`), `remix/tar-parser` (streaming `parseTar`, `TarParser`), `remix/terminal` (`ansi`, `stripAnsi`, `createStyles`, `shouldUseColors` — replaces chalk), `remix/node-serve` (uWebSockets.js-backed alternative to `node-fetch-server`), `remix/fetch-proxy` (`createFetchProxy` for BFF / reverse-proxy patterns). Also points at the larger utility surfaces with their own sub-skills (templating, headers, build). Load whenever the user is detecting a content type from a filename, streaming a large file without buffering, parsing a tar archive (npm tarballs, CI artifacts), styling terminal output for a CLI / scaffolder, building a reverse proxy or BFF, picking a high-perf alternative server, or about to install `mime` / `mime-types`, `chalk` / `kleur` / `picocolors`, `tar` / `tar-stream`, `http-proxy` / `http-proxy-middleware`, `fs-extra`. Quick check before adding any "small utility" npm dep.
---

# Utilities

The small built-ins Remix ships besides middlewares and routing. Each is a focused library — table first, deep doc as needed.

## Reference card

| Package | Import | One-liner |
|---|---|---|
| **html-template** | `remix/html-template` | Safe HTML templating with auto-escaping. See [templating](../templating/SKILL.md). |
| **headers** | `remix/headers` | Typed parsers for Accept, CacheControl, Cookie, Range, etc. See [headers](../headers/SKILL.md). |
| **assets** | `remix/assets` | On-demand JS/TS/CSS compilation. See [build](../build/SKILL.md). |
| **mime** | `remix/mime` | Content-type detection from filename or magic bytes |
| **lazy-file** | `remix/lazy-file` | `LazyFile` / `LazyBlob` — File-shaped objects that defer content reads |
| **fs** | `remix/fs` | Node `fs` wrappers — `openLazyFile`, `writeFile` returning `LazyFile`s |
| **tar-parser** | `remix/tar-parser` | Streaming tar archive parser |
| **terminal** | `remix/terminal` | ANSI styling, color detection, terminal abstractions |
| **node-serve** | `remix/node-serve` | High-perf alternative to `node-fetch-server` via uWebSockets.js |
| **fetch-proxy** | `remix/fetch-proxy` | `createFetchProxy` — reverse-proxy helper |

## `mime` — content type detection

```ts
import {
  detectContentType,
  detectMimeType,
  isCompressibleMimeType,
  mimeTypeToContentType,
  defineMimeType,
} from 'remix/mime'

detectContentType('photo.jpg')              // 'image/jpeg'
detectContentType('archive.tar.gz')         // 'application/gzip'
isCompressibleMimeType('text/html')         // true
isCompressibleMimeType('image/png')         // false (already compressed)
mimeTypeToContentType('text/html')          // 'text/html; charset=utf-8'

defineMimeType({ extensions: ['.mdx'], mimeType: 'text/markdown' })
```

Used internally by `staticFiles` and `compression` middlewares. Reach for it directly when serving files outside those middlewares' paths.

## `lazy-file` — File-shaped, lazy-read

```ts
import { LazyFile, LazyBlob } from 'remix/lazy-file'

const file = new LazyFile(
  () => fs.createReadStream('big.bin'),     // content provider — called on demand
  { name: 'big.bin', type: 'application/octet-stream', size: 1_000_000 },
)

// file.name, file.size, file.type   — synchronous, no read yet
// file.stream()                      — opens the stream now
// file.arrayBuffer()                 — buffers everything (avoid for large files)
```

Why: lets you build a `File`-API object without paying for the read. Used by `file-storage`, `form-data-parser`, and any place that wants to look like a Web `File` without loading content.

## `fs` — Node helpers that return LazyFiles

```ts
import { openLazyFile, writeFile } from 'remix/fs'

const upload = await openLazyFile('uploads/report.pdf')
// LazyFile with stats already populated — stream() pulls bytes on demand

await writeFile('out/snapshot.json', JSON.stringify(data))
```

Thin layer over `node:fs` with the right defaults for the Remix ecosystem.

## `tar-parser` — streaming tar reading

```ts
import { parseTar, TarParser, TarParseError } from 'remix/tar-parser'

for await (const entry of parseTar(stream)) {
  // entry.header.name, entry.header.size, entry.header.type
  // entry.stream()   — body of this file in the archive
  if (entry.header.name.endsWith('package.json')) {
    const text = await new Response(entry.stream()).text()
    // ...
  }
}
```

Niche but solid when you need it (downloads from registries, custom CI artifacts, etc.).

## `terminal` — CLI styling

```ts
import { ansi, stripAnsi, createStyles, createTerminal, shouldUseColors } from 'remix/terminal'

const colors = shouldUseColors()
const style  = createStyles({ enabled: colors })

console.log(style.red.bold('error') + ' ' + style.dim('see logs'))

stripAnsi('\x1b[31merror\x1b[0m')   // 'error' — for logs / tests
```

Used by `remix doctor`, `remix new`, and the scaffolders in this plugin. Use it for your own CLI tooling instead of pulling in `chalk` / `kleur`.

## `node-serve` — high-perf server

```ts
import { serve } from 'remix/node-serve'

serve({
  port: 3000,
  fetch: (request) => router.fetch(request),
})
```

uWebSockets.js-backed alternative to `node-fetch-server` + `http.createServer`. Faster under high load (mostly because of TLS handling), at the cost of an additional native dep. Use only if profiling shows you need it.

## `fetch-proxy` — reverse-proxy helper

```ts
import { createFetchProxy } from 'remix/fetch-proxy'

const proxy = createFetchProxy({
  target: 'https://upstream-api.example.com',
  // optional: pathRewrite, headers, etc.
})

router.get('/api/upstream/*', ({ request }) => proxy.fetch(request))
```

For BFF patterns where you want to forward selected routes to another origin without copying bodies or rebuilding headers manually.

## What's NOT here (and where it lives)

- **multipart-parser** — used by `formData()`. Direct usage covered in [forms](../forms/SKILL.md).
- **cookie** — signed cookies. See [cookies](../cookies/SKILL.md).
- **route-pattern** — internal to fetch-router. Don't import directly.
- **assert** — re-export of node's `assert/strict`. Use [testing](../testing/SKILL.md).

## When to add one to add-middleware.ts

Most of these aren't middlewares (they're libraries). The few that could be — `compression` already exists, `staticFiles` already exists. If you find yourself building a thin middleware around `mime`, `fetch-proxy`, or `node-serve`, that's app code, not framework — keep it in your own `middleware/` directory.
