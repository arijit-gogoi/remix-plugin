# Client Hydration

Server-rendered HTML is interactive only after a corresponding script runs in the browser. `remix/ui/client` provides `hydrate` for that handoff.

## Full-page hydration

```tsx
// app/entry.client.tsx
import { hydrate } from 'remix/ui/client'
import { App } from './app.tsx'

hydrate(document, <App />)
```

The server emits HTML that matches what `<App />` would render. `hydrate(document, …)` walks the DOM, attaches event listeners, and wires refs without re-rendering from scratch.

## Island / partial hydration

Most pages don't need full-page JS. Hydrate only the interactive bits:

```tsx
// app/entry.client.tsx
import { hydrate } from 'remix/ui/client'
import { CartButton } from './components/cart-button.tsx'
import { ReviewForm } from './components/review-form.tsx'

const cartEl = document.getElementById('cart-button')
if (cartEl) hydrate(cartEl, <CartButton />)

const reviewEl = document.getElementById('review-form')
if (reviewEl) hydrate(reviewEl, <ReviewForm bookId={Number(reviewEl.dataset.bookId)} />)
```

The rest of the page stays as static HTML — zero JS cost.

## Wiring the client entry

In `app/router.ts`, expose the client entry asset to the renderer:

```ts
import { renderToStream } from 'remix/ui/server'

renderToStream(<Document>{node}</Document>, {
  resolveClientEntry: (entry) => `/assets/${entry}.js`,
})
```

The `<Document>` component places `<script type="module" src="…"></script>` in `<body>` for each registered entry.

## Component identity

The component you hydrate with must match what the server rendered. If markup differs, the framework logs a hydration mismatch and renders client-side from scratch — defeating the point.

Common causes of mismatch:
- Conditional content based on `typeof window !== 'undefined'`.
- Locale-dependent date formatting that differs between server and client clocks.
- Random IDs generated at render time (use `useId`-style stable IDs).

## Build pipeline

The framework's build expects client entries to be emitted as separate ES modules. Most setups use:

- **Vite** for dev (`vite` config with `remix/vite-plugin`).
- **esbuild** for production (server bundle + per-island client bundle).

A `package.json` build script wires this together; `remix new` generates a starter setup.

## Without a build step

Tiny scripts work without bundling. Hand-write the entry as a module, serve it as a static file, point `resolveClientEntry` at the URL. Fine for one-page demos; doesn't scale.

## Detecting client vs server

```ts
import { isServer } from 'remix/ui'

if (isServer()) {
  // running in renderToStream
} else {
  // running in the browser after hydrate
}
```

Use sparingly. The whole point of isomorphism is to write components without branching.
