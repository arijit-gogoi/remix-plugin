# JSX Runtime

The `remix/ui` package implements its own JSX runtime, configured via `tsconfig.json`:

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

TypeScript emits calls to `remix/ui/jsx-runtime` instead of React's. The exports — `jsx`, `jsxs`, `jsxDEV`, `Fragment` — produce `RemixElement` objects, not React nodes.

## `RemixElement`

```ts
type RemixElement = {
  type:  string | ((handle: Handle<any>) => () => RemixNode)
  props: Record<string, any> & { children?: RemixNode }
  key?:  string | number
}
```

`type` is either:

- a **string** for a host element (`'div'`, `'a'`, `'button'`, …)
- a **function** for a component

## `RemixNode`

```ts
type RemixNode =
  | RemixElement
  | string
  | number
  | boolean
  | null
  | undefined
  | RemixNode[]
```

What a render function returns, what `children` carries. The framework flattens arrays and ignores falsy values (`false`, `null`, `undefined`).

## Intrinsic elements

All standard HTML and SVG tags work. Attributes use the *HTML* naming, not React's quirks:

| HTML attribute | React | Remix UI |
|---------------|-------|----------|
| `class`        | `className` | `class` (also accepts `className`) |
| `for`          | `htmlFor` | `for` (also accepts `htmlFor`) |
| `onclick`      | `onClick` | `mix={on('click', fn)}` |
| `tabindex`     | `tabIndex` | `tabindex` |

Boolean attributes (`disabled`, `checked`, `hidden`, …) render correctly when their value is `true`; they're omitted on `false`.

## The `mix` prop

`mix` accepts a *mixin* or an array of mixins — functions or objects that augment the element with styles, listeners, animations, refs. The two most common mixins:

```ts
import { css, on } from 'remix/ui'

<button mix={[
  css({ padding: '0.5rem 1rem', borderRadius: 8 }),
  on('click', () => …),
]}>
```

## Fragments

```tsx
import { Fragment } from 'remix/ui'

return () => (
  <>
    <Header />
    <Main />
    <Footer />
  </>
)
```

`<>…</>` desugars to `<Fragment>…</Fragment>`. Use it when you'd otherwise be forced to wrap in a `<div>` just to satisfy JSX's single-root rule.

## Server vs client

The runtime is isomorphic. The exact same `Counter` component renders to HTML on the server (via `renderToStream`) and hydrates on the client (via `hydrate`). No `'use client'` directives.

## TypeScript surface

If you need the element type for a generic:

```ts
import type { RemixElement, RemixNode } from 'remix/ui'

function withFallback(node: RemixNode, fallback: RemixNode): RemixElement {
  return <Frame fallback={fallback}>{node}</Frame>
}
```
