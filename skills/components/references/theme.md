# Theme — createTheme, the theme proxy, CSS variables

`remix/ui/theme` is the design-token system for Remix UI. It replaces CSS-in-JS theme providers (styled-components/emotion theme prop) and the role Tailwind's config plays in coordinating tokens. You define values once; the framework emits CSS custom properties, and components consume them through a typed proxy.

## Imports

```ts
import {
  createTheme, theme,
  RMX_01, RMX_01_GLYPHS,
  glyphContract, glyphNames,
  type CreateThemeOptions, type ThemeValues, type ThemeValue,
  type ThemeComponent, type ThemeMix, type ThemeStyleProps,
  type ThemeVars, type ThemeUtility,
} from 'remix/ui/theme'
```

## Three pieces

1. **`createTheme(preset, overrides?)`** — produces a `ThemeComponent` you mount near the document root. Mounting emits the CSS variables for the contract.
2. **The `theme` proxy** — a typed object you reference inside `css({...})` to read those variables. `theme.color.bg` becomes `var(--rmx-color-bg)`.
3. **`RMX_01`** — the shipped starter preset (colors, spacing, radii, typography, glyph values). Use as-is, extend, or replace.

## Quick start

```tsx
// app/theme.ts
import { createTheme, RMX_01 } from 'remix/ui/theme'

export const Theme = createTheme(RMX_01, {
  // override individual tokens; everything else inherits from RMX_01
  color: {
    accent: '#0a66ff',
  },
  radius: {
    md: '0.5rem',
  },
})
```

```tsx
// app/ui/document.tsx
import { Theme } from '../theme.ts'

export function Document(handle) {
  return () => (
    <html lang="en">
      <head>{/* ... */}</head>
      <Theme>
        <body>{handle.props.children}</body>
      </Theme>
    </html>
  )
}
```

Anywhere downstream:

```tsx
import { theme } from 'remix/ui/theme'
import { css } from 'remix/ui'

const card = css({
  background: theme.color.bg,
  color:      theme.color.fg,
  border:     `1px solid ${theme.color.border}`,
  borderRadius: theme.radius.md,
  padding:    theme.spacing.lg,
})

<article mix={card}>...</article>
```

`theme.color.bg` is typed against the contract; misspellings won't compile.

## The contract

A theme's *contract* is the set of token names — what keys exist under `color`, `spacing`, `radius`, `font`, `glyphValues`, etc. The contract is fixed by the preset (or by your custom one); the *values* can be overridden per-environment.

`RMX_01` defines the standard contract: colors (semantic + scales), spacing scale, radii, font families & sizes, animation curves, glyph names. Inspect the exported types for the full surface.

To use a different contract, pass a different preset (or build one with `createTheme`'s contract shape).

## `CreateThemeOptions`

The second argument to `createTheme` is a partial override. Fill in only what you want to change:

```ts
createTheme(RMX_01, {
  color:   { accent: '#0a66ff', bg: '#fafafa' },
  spacing: { lg: '1.25rem' },
  radius:  { md: '0.5rem' },
  font:    { sans: 'Inter, system-ui, sans-serif' },
  glyphValues: { ...RMX_01_GLYPHS, 'co-logo': {...} },
})
```

Unspecified fields inherit. The override is shallow-merged per top-level group (color, spacing, etc.), so you can't accidentally erase a category by providing one entry.

## Multiple themes (dark/light, multi-tenant)

```tsx
const Light = createTheme(RMX_01, {/* light values */})
const Dark  = createTheme(RMX_01, {/* dark values */})
```

Mount whichever is active. To switch at runtime, conditionally render:

```tsx
<{darkMode ? Dark : Light}>
  <body>…</body>
</…>
```

Or wrap a region in a different theme — themes nest, and inner ones override outer CSS variables for their subtree.

## Glyph contract

`glyphContract` and `glyphNames` are the typed surface for the icon system — they're what makes `<Glyph name="…" />` autocomplete. See [`glyph.md`](./glyph.md) for the workflow.

## CSS variable names

The proxy emits `var(--rmx-<group>-<token>)`-style names. You generally don't need to know them — let the proxy give you the reference. But if you need to read a token from a stylesheet you don't control, the convention is `--rmx-color-fg`, `--rmx-spacing-lg`, etc.

## When to override RMX_01 vs build a new contract

- **Override `RMX_01`** when you want the shipped contract (color names, spacing scale) but with your own values. This is 90% of projects.
- **Build a new contract** when your design system has fundamentally different token categories (e.g. you need `elevation`, `motion-duration` as first-class). This is rare and means writing your own preset.

## Pitfalls

- **Mounting the theme component too deep.** If you mount inside `<body>` instead of around it, anything outside the wrapper (header banners, portals at document root) won't see the CSS variables. Wrap the highest level you control.
- **Reading `theme.x.y` outside a component.** The proxy returns string references, so this works at module scope:
  ```ts
  const cardStyle = css({ background: theme.color.bg })
  ```
  …but if you try to *resolve* the value (read the actual computed string), you need to be in a DOM context where the theme is applied.
- **Two themes with conflicting CSS variable names.** Each `createTheme` returns its own component. Nesting them works; reusing the same set of names at the same scope races. Pick one root theme per page.
