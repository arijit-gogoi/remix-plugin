# Glyph + icon sheets

`remix/ui/glyph` replaces lucide-react, heroicons, react-icons, and friends. Glyphs are SVG `<symbol>` definitions you register once and reference everywhere with `<Glyph name="…" />`.

## Imports

```ts
import {
  Glyph, createGlyphSheet,
  type GlyphProps, type GlyphSheetProps, type GlyphSheetComponent,
  type GlyphName, type GlyphValues, type GlyphSymbol,
} from 'remix/ui/glyph'
```

The icon set is contributed by your theme. The shipped `RMX_01` preset (in [`theme`](./theme.md)) defines `RMX_01_GLYPHS` — a reasonable starting set.

## Two-step usage

### Step 1: mount the sheet once

```tsx
import { createGlyphSheet } from 'remix/ui/glyph'
import { RMX_01_GLYPHS } from 'remix/ui/theme'

const Sheet = createGlyphSheet(RMX_01_GLYPHS)

// In your <Document>:
<body>
  <Sheet />
  {/* …rest of the app */}
</body>
```

`createGlyphSheet(values)` returns a `GlyphSheetComponent` that renders a hidden `<svg>` containing all glyph `<symbol>` definitions. Mount it once, near the top of `<body>`. Subsequent `<Glyph />` references resolve to `<use href="#sheet-id">`.

The returned component also exposes:
- `Sheet.ids` — `Readonly<Record<GlyphName, string>>` if you need raw `<use href="…">` somewhere
- `Sheet.values` — the original values map (useful for theme inspection)

### Step 2: reference by name

```tsx
import { Glyph } from 'remix/ui/glyph'

<Glyph name="check" />
<Glyph name="chevron-down" />
<Glyph name="search" />
```

`name` is type-narrowed to `GlyphName`, so the autocomplete shows exactly what's in your sheet. Misspellings are compile errors.

`GlyphProps` extends `<svg>` element props — pass `width`, `height`, `aria-label`, `mix={css({color: 'red'})}` (color inherits from `currentColor` by default).

## Defining your own glyphs

`GlyphValues` is a map of `name → GlyphSymbol`. Each symbol carries the SVG content for one glyph:

```ts
import { createGlyphSheet, type GlyphValues } from 'remix/ui/glyph'

const myGlyphs = {
  // include the shipped set and extend it
  ...RMX_01_GLYPHS,
  'company-logo': {
    viewBox: '0 0 24 24',
    paths: ['M12 2L2 22h20L12 2z'],   // or however the symbol type is shaped
  },
} satisfies GlyphValues

export const Sheet = createGlyphSheet(myGlyphs)
```

For the exact `GlyphSymbol` shape (it covers `<path>`, `<rect>`, `<g>`, transform groups), inspect the type — TypeScript will guide you, since the shape is part of the contract.

## Theme integration

`createTheme()` (see [`theme.md`](./theme.md)) accepts a `glyphValues` override. Define icons centrally with the rest of your design tokens:

```ts
const appTheme = createTheme(RMX_01, {
  // …colors, spacing…
  glyphValues: { ...RMX_01_GLYPHS, 'company-logo': {...} },
})
```

When the theme is applied (mixin on `<html>` or `<body>`), the glyph sheet is part of the package. `<Glyph name="company-logo" />` then resolves correctly anywhere in the tree.

## Color, size, alignment

The SVG uses `currentColor` for stroke/fill, so glyphs inherit text color. Override per-instance:

```tsx
<Glyph name="warning" mix={css({ color: 'var(--color-danger)' })} />
<Glyph name="check"   width="20" height="20" />
```

For inline-with-text rendering, set `display: inline-block; vertical-align: -0.125em` (or use a theme utility).

## Why a sheet, not per-component SVGs?

Three reasons:

1. **One paint per glyph**, no matter how many `<Glyph>`s render — `<use>` references are cheap.
2. **Theme-driven** — changing the sheet swaps the icon set everywhere atomically.
3. **No tree-shaking surprises** — the sheet contains exactly the glyphs you registered. There's no transitive bundle of unused icons.

## Pitfalls

- **Mounting the sheet inside an island** — glyphs in the rest of the page can't reach those `<symbol>`s by id. Mount once at the document root, not inside a sub-tree.
- **Server-rendering without the sheet** — `<Glyph>` renders a `<use>` that references a missing id. Either render the sheet on the server (in your `Document`) or accept that icons appear after hydration.
- **Naming collisions** — `GlyphValues` is a flat namespace. If you extend `RMX_01_GLYPHS`, your custom entries override builtins of the same name. Pick a prefix (e.g. `'co-…'`) for project glyphs to keep them separated.
