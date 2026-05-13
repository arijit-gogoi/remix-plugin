# The render() Utility

`render()` is a project-local helper, not a framework export. It wraps `renderToStream` with the app's `Document` shell and returns a `Response`.

## A typical implementation

```tsx
// app/utils/render.tsx
import type { RemixNode } from 'remix/ui'
import { renderToStream } from 'remix/ui/server'
import { Document } from '../ui/document.tsx'

export type RenderOptions = ResponseInit & {
  title?:    string
  cssEntry?: string
}

export function render(node: RemixNode, options: RenderOptions = {}): Response {
  const { title, cssEntry, ...init } = options

  const stream = renderToStream(
    <Document title={title} cssEntry={cssEntry}>
      {node}
    </Document>,
    {
      // resolveFrame:       async (frame) => { … }
      // resolveClientEntry: async (entry) => { … }
    },
  )

  return new Response(stream, {
    ...init,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...init.headers,
    },
  })
}
```

## Why have it at all?

- Lets every action call `render(<Page />)` without restating the Document shell.
- Centralises headers (security, content-type, cache).
- Single place to wire client entries, asset paths, and frame resolution.

## Variants

```tsx
// 400 — validation error
return render(<NewBookPage errors={parsed.issues} />, { status: 400 })

// custom headers
return render(<HomePage />, {
  headers: { 'Cache-Control': 'public, max-age=60' },
})

// per-page title
return render(<BookPage book={book} />, { title: book.title })
```

## Pairing with `redirect()`

`redirect()` from `remix/response/redirect` is the right call for post-action redirects (e.g. after a successful create/update/delete):

```ts
import { redirect } from 'remix/response/redirect'

return redirect(routes.admin.books.index.href())
```

You don't run it through `render()` — it returns its own `Response` with `Location` and a 302 status.
