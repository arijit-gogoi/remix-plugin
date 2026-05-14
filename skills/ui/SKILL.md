---
name: remix-ui
description: The Remix v3 UI framework (`remix/ui`) — its own JSX runtime (NOT React, NOT Preact, NOT Solid). Components are `(handle: Handle<Props>) => () => RemixElement` — setup phase runs once, render phase runs on `handle.update()`. State is a plain `let` in the closure; no hooks, no signals, no proxies. DOM event listeners and styles attach via the `mix` prop using mixins (`on('click', fn)`, `css({...})`). `renderToStream` / `renderToString` from `remix/ui/server` for SSR, `<Frame>` boundaries for streaming with fallbacks, `hydrate` from `remix/ui/client` for islands. The shell is a project-local `Document` component plus a `render()` utility wrapping `renderToStream`. Load whenever the user is building pages / components / layouts, configuring `tsconfig` for the Remix JSX runtime (`jsxImportSource: 'remix/ui'`), wondering how to do state without `useState`, porting React (or Vue / Svelte / Solid) code, or asking "is this React?" (no). For the shipped component library — Button, Menu, Popover, Combobox, Glyph, animation, theme — see /remix:components. For server-side HTML without JSX, see /remix:templating.
---

# UI Framework

The UI framework is *not React*. Don't reach for hooks, `useState`, `useEffect`, or implicit re-rendering. Components are plain functions with a two-phase model — set up once, render many times — and re-renders are explicit.

## Imports

```ts
import { renderToStream, renderToString } from 'remix/ui/server'
import { css, on, mix } from 'remix/ui'
```

For client hydration:

```ts
import { hydrate } from 'remix/ui/client'
```

## tsconfig.json

The Remix JSX runtime is configured in `tsconfig.json`. The bootstrap template ships a working one — leave it alone unless you know what you're doing:

```jsonc
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "remix/ui",
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

JSX expressions compile to `RemixElement` objects, not React elements.

## A component

A component is a function that receives a `Handle` and returns JSX. The function body **runs once at creation time** — that's the setup phase. The returned function (the render phase) runs on every update.

```tsx
import type { Handle } from 'remix/ui'

export function Counter(handle: Handle<{ start?: number }>) {
  // Setup phase — runs once
  let count = handle.props.start ?? 0

  function increment() {
    count += 1
    handle.update()      // explicit re-render
  }

  // Render phase — runs every update
  return () => (
    <button mix={on('click', increment)}>
      Count: {count}
    </button>
  )
}
```

Key differences from React:
- State is a plain `let` in the setup closure. No reducer, no hook.
- Re-renders happen because *you* called `handle.update()`. Nothing tracks reads.
- The render function (`() => …`) closes over the setup vars.

## The Document shell

Every page hangs off a `Document` component that emits the `<html>` / `<head>` / `<body>` shell:

```tsx
// app/ui/document.tsx
import { css } from 'remix/ui'

export function Document(handle: Handle<{ title?: string; children: RemixNode }>) {
  return () => (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{handle.props.title ?? 'App'}</title>
        <link rel="stylesheet" href="/assets/app.css" />
      </head>
      <body>
        {handle.props.children}
      </body>
    </html>
  )
}
```

## Rendering to HTML

`renderToStream` returns a `ReadableStream<Uint8Array>` — feed it straight into a `Response`. It also handles `<Frame>` boundaries: if a frame has a `fallback`, the framework streams the fallback first and patches the real content in via `<template>` tags as it resolves.

```tsx
// app/utils/render.tsx
import type { RemixNode } from 'remix/ui'
import { renderToStream } from 'remix/ui/server'
import { Document } from '../ui/document.tsx'

export function render(node: RemixNode, init?: ResponseInit): Response {
  const stream = renderToStream(<Document>{node}</Document>, {
    // resolveFrame, resolveClientEntry, etc.
  })

  return new Response(stream, {
    ...init,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...init?.headers,
    },
  })
}
```

`renderToString` exists for non-streaming cases (tests, snapshot output) but `renderToStream` is the default.

## A full page component

```tsx
// app/views/home-page.tsx
import { css } from 'remix/ui'

const wrap = css({ padding: '2rem', fontFamily: 'system-ui' })
const title = css({ fontSize: '2rem', marginBottom: '1rem' })

export function HomePage() {
  return () => (
    <main mix={wrap}>
      <h1 mix={title}>Welcome to Remix v3</h1>
      <p>This page was rendered on the server.</p>
    </main>
  )
}
```

## Mixins — `on`, `mix`, animations

DOM event listeners and stylesheets attach via mixins on the special `mix` prop:

```tsx
import { on, css } from 'remix/ui'

return () => (
  <button mix={[
    css({ padding: '0.5rem 1rem' }),
    on('click', () => handle.update()),
  ]}>
    Click me
  </button>
)
```

## Client hydration

If you need interactive components on the client, mark a sub-tree for hydration:

```tsx
import { hydrate } from 'remix/ui/client'
import { Counter } from './counter.tsx'

hydrate(document.getElementById('counter')!, <Counter start={0} />)
```

The server renders the initial markup; `hydrate` wakes it up on the client without re-rendering from scratch.

## Common porting mistakes from React

| React habit                | Remix v3 equivalent                                       |
|----------------------------|-----------------------------------------------------------|
| `useState`                 | `let value = …` in setup, mutate, then `handle.update()`  |
| `useEffect(fn, [])`        | Run it in setup                                           |
| `useEffect(fn, [dep])`     | Track changes yourself and call when dep changes          |
| `onClick={fn}`             | `mix={on('click', fn)}`                                   |
| `className="x"`            | `mix={css({...})}` or `mix={cls('x')}`                    |
| `React.memo`               | The framework doesn't re-render unless you call `update`  |

## Component library

For shipped primitives — Accordion, Button, Combobox, Menu, Popover, Select, Glyph, animation, theme — see [components](../components/SKILL.md). They use the same `Handle` + `mix` model as this page.

## Alternative: tagged HTML templates

If you don't want the JSX runtime — small endpoints, emails, fragments returned to HTMX-style clients — use [templating](../templating/SKILL.md) (`html\`...\``). It composes safely (auto-escaped) without a component tree.

## Build pipeline

The JS/CSS that hydrates these components is compiled and served by the [build](../build/SKILL.md) pipeline (`createAssetServer`). Configure it once per project — replaces Vite/esbuild.

## Further reading

- `references/component-model.md` — Handle, setup vs render, lifecycle
- `references/jsx-runtime.md` — `RemixElement`, intrinsic tags, props
- `references/streaming-ssr.md` — `renderToStream`, frames, fallbacks
- `references/client-hydration.md` — `hydrate`, partial hydration, islands
- See also: [templating](../templating/SKILL.md) (HTML without JSX), [build](../build/SKILL.md) (asset pipeline)
