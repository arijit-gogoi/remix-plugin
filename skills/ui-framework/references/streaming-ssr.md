# Streaming SSR — renderToStream

```ts
import { renderToStream, renderToString } from 'remix/ui/server'

const stream = renderToStream(<Document>{node}</Document>, options?)
const html   = await renderToString(<Document>{node}</Document>, options?)
```

`renderToStream` returns a `ReadableStream<Uint8Array>`. Hand it to a `Response` and the browser starts receiving bytes immediately — before slow data has resolved.

## Why streaming matters

Server rendering blocks on whatever data the page needs. Without streaming, a single slow query pushes the whole TTFB up. With streaming + `<Frame>` boundaries, the shell ships immediately and slow parts arrive as `<template>` patches in the same response.

## Putting it together — `app/utils/render.tsx`

```tsx
import type { RemixNode } from 'remix/ui'
import { renderToStream } from 'remix/ui/server'
import { Document } from '../ui/document.tsx'

export function render(
  node: RemixNode,
  init: ResponseInit & { title?: string } = {},
): Response {
  const { title, ...rest } = init
  const stream = renderToStream(
    <Document title={title}>{node}</Document>,
  )
  return new Response(stream, {
    ...rest,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...rest.headers,
    },
  })
}
```

## `<Frame>` and `fallback`

A `Frame` is a streaming boundary. If its children block on a promise and the frame has a `fallback`, the framework writes the fallback first and patches the real content in later.

```tsx
import { Frame } from 'remix/ui'

return () => (
  <main>
    <header>Books</header>

    <Frame fallback={<p>Loading top sellers…</p>}>
      <TopSellers />
    </Frame>

    <Frame fallback={<p>Loading reviews…</p>}>
      <RecentReviews />
    </Frame>
  </main>
)
```

What lands in the browser:
1. `<main><header>Books</header><p>Loading top sellers…</p><p>Loading reviews…</p>…`
2. When `<TopSellers />` resolves: `<template>` patch replacing the first placeholder.
3. Same for `<RecentReviews />`.

A `Frame` without a `fallback` blocks the stream until it resolves — useful for above-the-fold content.

## Options

`renderToStream(node, options?)`:

| Option              | Notes                                                       |
|---------------------|-------------------------------------------------------------|
| `resolveFrame`      | Hook for custom frame resolution (caching, dedup, etc.)     |
| `resolveClientEntry`| Maps client-entry references to script URLs                 |
| `signal`            | `AbortSignal` — aborts rendering if the request is cancelled |
| `bootstrap`         | Initial `<script>` tags to inject in `<head>` or `<body>`    |

## `renderToString`

For tests and tools that want a single HTML string:

```ts
const html = await renderToString(<Page />)
```

It waits for all frames to resolve. Don't use this in your hot path — you lose streaming entirely.

## Errors during streaming

If a `Frame` throws after the response started, the framework writes a `<template>` patch with the error boundary's UI. Wrap risky frames with an error boundary component to control the failure rendering.

## Pairing with `Cache-Control`

Streamed responses can still be cached — but cache the *result*, not the stream itself. A CDN sees the bytes; once the response completes it caches them. The "loading" placeholders are part of the cached HTML. For per-user pages, set `Cache-Control: private, no-store`.
