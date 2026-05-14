# Component catalogue — full prop tables

Verified against `remix@next` (3.0.0-beta.0). Each entry lists the subpath, primary exports, and the props the user actually passes in JSX.

Every component is a `(handle: Handle<Props>) => () => RemixElement` function — the two-phase setup/render model from [ui](../../ui/SKILL.md). Most styling-relevant exports are `CSSMixinDescriptor`s you opt into with `mix={[...]}`.

## Accordion — `remix/ui/accordion`

```ts
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
  AccordionChangeEvent,
  type AccordionProps, type AccordionItemProps,
  type AccordionTriggerProps, type AccordionContentProps,
} from 'remix/ui/accordion'
```

| Component | Key props |
|---|---|
| `Accordion` (single) | `type?: 'single'`, `value? \| defaultValue?: string \| null`, `onValueChange?`, `collapsible?: boolean`, `disabled?`, `headingLevel?: 1–6` |
| `Accordion` (multiple) | `type: 'multiple'`, `value? \| defaultValue?: string[]`, `onValueChange?`, `disabled?`, `headingLevel?` |
| `AccordionItem` | `value: string` (required), `disabled?` |
| `AccordionTrigger` | `indicator?: RemixNode \| null`, `type?: 'button' \| 'submit' \| 'reset'` |
| `AccordionContent` | (children only) |

Emits a bubbling `rmx:accordion-change` DOM event carrying `{ accordionType, itemValue, value }`. Listen with `mix={on('rmx:accordion-change', …)}`.

## Anchor — `remix/ui/anchor`

```ts
import { anchor, type AnchorOptions, type AnchorPlacement } from 'remix/ui/anchor'

const cleanup = anchor(floatingEl, anchorEl, options)
// later: cleanup() to detach
```

`AnchorOptions`:

| Field | Type | Notes |
|---|---|---|
| `placement?` | `'top' \| 'bottom' \| 'left' \| 'right'` plus `*-start` / `*-end` | direction relative to anchor |
| `inset?` | `boolean` | align inside the anchor rather than outside |
| `relativeTo?` | `string` | CSS selector of containing element |
| `offset?` | `number \| (el) => number` | unified offset on the placement axis |
| `offsetX?` / `offsetY?` | `number \| (el) => number` | per-axis override |

This is the positioning primitive. For surfaces with focus/dismiss management, use `Popover` (which builds on `anchor`).

## Breadcrumbs — `remix/ui/breadcrumbs`

```ts
import { Breadcrumbs, type BreadcrumbItem, type BreadcrumbsProps } from 'remix/ui/breadcrumbs'

<Breadcrumbs items={[
  { label: 'Home', href: '/' },
  { label: 'Library', href: '/library' },
  { label: 'Current Book', current: true },
]} separator="/" />
```

| `BreadcrumbItem` field | Type |
|---|---|
| `label` | `RemixNode` (string or element) |
| `href?` | `string` |
| `current?` | `boolean` — emits `aria-current="page"` |

Rendered as `<nav>` with proper ARIA. `separator` defaults to a `›`-style glyph; pass a `RemixNode` to override.

## Button — `remix/ui/button`

```ts
import {
  Button, type ButtonProps, type ButtonTone,
  baseStyle, iconStyle, labelStyle,
  primaryStyle, secondaryStyle, ghostStyle, dangerStyle,
} from 'remix/ui/button'
```

| Prop | Type | Notes |
|---|---|---|
| `tone?` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | applies the matching default style mixin |
| `startIcon?` / `endIcon?` | `RemixNode` | typically a `<Glyph />` |
| `children?` | `RemixNode` | the label |

All `<button>` element props are passed through (`disabled`, `type`, `aria-*`, etc.). To override the visual default, compose your own style mixins via `mix={[primaryStyle, css({...})]}`.

## Combobox — `remix/ui/combobox`

```ts
import {
  Combobox, ComboboxChangeEvent,
  type ComboboxProps, type ComboboxOptionProps, type ComboboxHandle,
  type ComboboxOpenStrategy,
  inputStyle, popoverStyle,
} from 'remix/ui/combobox'
```

Filterable autocomplete + popover. The user types, options narrow.

| Prop | Type | Notes |
|---|---|---|
| `defaultValue?` | `string \| null` | uncontrolled initial value |
| `disabled?` | `boolean` |  |
| `name?` | `string` | for form submission |
| `placeholder?` | `string` |  |
| `inputId?` | `string` | id for the `<input>` |

`ComboboxOption` accepts `label: string`, `value: string`, optional `searchValue` (custom filter token), `disabled?`.

`ComboboxHandle` (via `ref`) exposes `{ isOpen, value, label, inputText, open(strategy?), close() }`. Strategies: `'selected' | 'selected-or-none' | 'first' | 'last'`.

Emits `rmx:combobox-change` carrying `{ label, optionId, value }`.

## Glyph — `remix/ui/glyph`

```ts
import {
  Glyph, createGlyphSheet,
  type GlyphProps, type GlyphSheetProps, type GlyphSheetComponent,
  type GlyphName, type GlyphValues,
} from 'remix/ui/glyph'

const Sheet = createGlyphSheet(values)
// then once near <body>: <Sheet />
// anywhere: <Glyph name="check" />
```

`Glyph` is an `<svg use href="#…">` against the `<symbol>` definitions emitted by the sheet. `name` is type-narrowed to `GlyphName`. Use `theme` (or `RMX_01` as a starting point) to populate icon values — see `glyph.md`.

## Listbox — `remix/ui/listbox`

Low-level option-list primitive used internally by `select`, `combobox`, `menu`. You rarely import this directly; reach for it when you need the navigation/highlight model without a wrapping trigger.

Exports include `ListboxProvider`, `ListboxOption`, `ListboxRef`, `ListboxRegisteredOption`, `ListboxValue`. See the source if you really need it.

## Menu — `remix/ui/menu`

```ts
import {
  Menu, MenuSelectEvent,
  buttonStyle, popoverStyle, listStyle, itemStyle,
  itemSlotStyle, itemLabelStyle, itemGlyphStyle, triggerGlyphStyle,
} from 'remix/ui/menu'
```

Dropdown / context menu with optional submenus and typeahead.

| Sub-component | Notable props |
|---|---|
| `Menu.Provider` | `label?: string` |
| `Menu.Trigger` | `AnchorOptions` (placement/offset) |
| `Menu.Item` | `name: string` (required), `value?`, `type?: 'item' \| 'checkbox' \| 'radio'`, `checked?`, `disabled?`, `label?`, `searchValue?` |
| `Menu.Submenu` | nested `Provider`/`Trigger`/`Item` set |

Selecting an item dispatches a bubbling `rmx:menu-select` event with `{ item: { id, name, type, value, checked?, label } }`.

## Popover — `remix/ui/popover`

```ts
import {
  Popover,
  type PopoverProps, type PopoverContext, type PopoverSurfaceOptions,
  type PopoverHideRequest,
  contentStyle, surfaceStyle,
} from 'remix/ui/popover'
```

Surface primitive with anchored positioning + focus/dismiss management. Composed of mixins rather than children components:

| API | Returns | Use on |
|---|---|---|
| `Popover.Context` | provider component | wraps the trigger + surface |
| `Popover.anchor(opts)` | mixin | the trigger element (binds anchor + placement) |
| `Popover.surface(opts)` | mixin | the floating element (binds open state, dismiss handlers) |
| `Popover.focusOnShow()` | mixin | the floating element (move focus in when shown) |
| `Popover.focusOnHide()` | mixin | the trigger (restore focus on hide) |

`PopoverSurfaceOptions`: `open`, `onHide(request?)`, `closeOnAnchorClick?`, `restoreFocusOnHide?`, `stopOutsideClickPropagation?`. `PopoverHideRequest.reason` is `'escape-key' \| 'outside-click'`.

See `anchor-popover.md` for full patterns.

## Scroll lock — `remix/ui/scroll-lock`

```ts
import { lockScroll, lockScrollOnToggle } from 'remix/ui/scroll-lock'

const unlock = lockScroll()              // disable scroll on document
unlock()                                  // restore

<dialog mix={lockScrollOnToggle()}>...</dialog>  // auto-locks while open
```

`lockScrollOnToggle()` returns a mixin you slap on a `<dialog>` / `<details>` / any element whose `open` state should drive body scroll lock.

## Select — `remix/ui/select`

```ts
import {
  Select, SelectChangeEvent,
  type SelectProps, type SelectOptionProps, type SelectContextProps,
} from 'remix/ui/select'
```

Native-feeling single-value selector with keyboard nav and typeahead. Trigger is a `<button>`; options live in a popover.

| Prop | Type |
|---|---|
| `defaultLabel` | `string` (required) — shown when no value picked |
| `defaultValue?` | `string \| null` |
| `name?` | `string` |
| `disabled?` | `boolean` |

`Select.Option` is a `<div>` extended with `{ label, value, searchValue?, disabled? }`.

Emits `rmx:select-change` carrying `{ label, optionId, value }`.

## Separator — `remix/ui/separator`

```ts
import { separatorStyle } from 'remix/ui/separator'

<hr mix={separatorStyle} />
<div role="separator" mix={separatorStyle} />
```

Just a `CSSMixinDescriptor`. No component — apply to any element. This is the entire surface.

## Animation — `remix/ui/animation`

```ts
import {
  animateEntrance, animateExit, animateLayout,
  spring, tween, easings,
  type SpringOptions, type SpringPreset, type SpringIterator,
  type TweenOptions, type BezierCurve,
} from 'remix/ui/animation'
```

Three mixins (`animateEntrance`, `animateExit`, `animateLayout`) plus two underlying iterators (`spring`, `tween`).

| API | Shape |
|---|---|
| `animateEntrance(keyframes, opts?)` | mixin: animate on first commit |
| `animateExit(keyframes, opts?)` | mixin: animate before removal |
| `animateLayout(opts?)` | mixin: FLIP-style layout transitions when bounding box changes |
| `spring(options)` | `SpringIterator` for hand-rolled animations |
| `tween(options)` | iterator with a `BezierCurve` ease |
| `easings` | named bezier presets |

See `animation.md` for the keyframe/options shape.

## Theme — `remix/ui/theme`

```ts
import {
  createTheme, theme,
  RMX_01, RMX_01_GLYPHS,
  glyphContract, glyphNames,
  type CreateThemeOptions, type ThemeValues, type ThemeValue,
  type ThemeComponent, type ThemeMix, type ThemeStyleProps,
  type ThemeVars, type ThemeUtility,
  type GlyphContract, type GlyphName, type GlyphValues,
} from 'remix/ui/theme'
```

`createTheme(preset, overrides?)` builds a theme component you mount near the root that emits CSS custom properties. The `theme` proxy gives typed access to those variables inside `css({...})`. `RMX_01` is the shipped starter preset (colors, spacing, radii, typography, glyph values).

See `theme.md` for the contract shape and override patterns.

## Cross-cutting: every component you'll style

Each component module exports its own `CSSMixinDescriptor`s — name pattern is `<thing>Style` (e.g. `inputStyle` on combobox, `surfaceStyle` on popover, `itemStyle` on menu). Compose them with `css({...})` overrides via `mix={[...]}` rather than reaching for global CSS or `className`. The styling system is described in [ui](../../ui/SKILL.md#mixins--on-mix-animations).
