# Anchor + Popover — positioning, focus, dismiss

Together, `remix/ui/anchor` and `remix/ui/popover` replace Floating UI, Radix Popover, and Headless UI Popover. Anchor is the math; Popover is the UX.

## Mental model

- **Anchor**: place a floating element relative to a trigger element. Pure positioning. No state, no focus.
- **Popover**: an opened/closed surface with anchor positioning plus focus management, dismiss handling, and click-outside.

If you need a tooltip, dropdown, combobox panel, dialog tail, or context menu — start with `Popover`. If you need raw "follow this element with that one" — use `anchor`.

## Anchor

```ts
import { anchor, type AnchorOptions } from 'remix/ui/anchor'

const cleanup = anchor(floatingEl, anchorEl, {
  placement: 'bottom-start',
  offset: 8,
})

// Returns a teardown function. Call it when the floating element is removed.
cleanup()
```

`AnchorOptions`:

| Field | Type | Effect |
|---|---|---|
| `placement?` | `'top' \| 'bottom' \| 'left' \| 'right'` + `-start`/`-end` variants | direction |
| `inset?` | `boolean` | inside the anchor instead of outside (sub-menus, overlays) |
| `relativeTo?` | `string` (selector) | constrain positioning to a containing element |
| `offset?` | `number \| (el) => number` | gap on the placement axis |
| `offsetX?` / `offsetY?` | `number \| (el) => number` | per-axis override |

`anchor()` re-measures on resize and scroll. The cleanup function unregisters the listeners — always call it when the floating element unmounts to avoid leaks.

## Popover

```ts
import { Popover, type PopoverSurfaceOptions } from 'remix/ui/popover'
```

Popover is a context + a set of mixins. You don't render a `<Popover.Surface>` component; you apply `Popover.surface(opts)` to *your* element. This keeps the markup yours.

### Mixin reference

| Mixin | Apply to | Purpose |
|---|---|---|
| `Popover.anchor(AnchorOptions)` | trigger element | binds the trigger + placement to the context |
| `Popover.surface(SurfaceOptions)` | floating element | binds open state, dismiss handlers |
| `Popover.focusOnShow()` | floating element | moves focus into the surface when opened |
| `Popover.focusOnHide()` | trigger element | restores focus to trigger when closed |

`PopoverSurfaceOptions`:

| Field | Type | Notes |
|---|---|---|
| `open` | `boolean` | required — drives visibility |
| `onHide` | `(request?: PopoverHideRequest) => void` | required — handle dismiss |
| `closeOnAnchorClick?` | `boolean` | default `true` — toggle on second click |
| `restoreFocusOnHide?` | `boolean` | default `true` |
| `stopOutsideClickPropagation?` | `boolean` | useful inside other popovers |

`PopoverHideRequest.reason` is `'escape-key' \| 'outside-click'`. Use it to log analytics or differentiate UX (e.g. don't restore form values on Escape but do on outside-click).

## Patterns

### Tooltip (hover-driven)

```tsx
import { Popover } from 'remix/ui/popover'
import { on } from 'remix/ui'

export function Tooltip(handle: Handle<{ label: string; children: RemixNode }>) {
  let open = false

  return () => (
    <Popover.Context>
      <span
        mix={[
          Popover.anchor({ placement: 'top', offset: 6 }),
          on('mouseenter', () => { open = true;  handle.update() }),
          on('mouseleave', () => { open = false; handle.update() }),
        ]}
      >
        {handle.props.children}
      </span>
      <div
        role="tooltip"
        mix={[
          Popover.surface({ open, onHide: () => { open = false; handle.update() } }),
          Popover.contentStyle,
        ]}
      >
        {handle.props.label}
      </div>
    </Popover.Context>
  )
}
```

### Dropdown (click-driven, with focus management)

```tsx
export function Dropdown(handle: Handle<{ label: string; children: RemixNode }>) {
  let open = false
  const toggle = () => { open = !open; handle.update() }

  return () => (
    <Popover.Context>
      <button
        mix={[
          Popover.anchor({ placement: 'bottom-start' }),
          Popover.focusOnHide(),
          on('click', toggle),
        ]}
      >
        {handle.props.label}
      </button>
      <div
        mix={[
          Popover.surface({ open, onHide: () => { open = false; handle.update() } }),
          Popover.focusOnShow(),
          Popover.surfaceStyle,
        ]}
      >
        {handle.props.children}
      </div>
    </Popover.Context>
  )
}
```

The two focus mixins are the difference between accessible and broken. `focusOnShow` moves focus into the panel when it opens (so keyboard users can navigate); `focusOnHide` restores focus to the trigger when it closes (so they're not stranded at `<body>`).

### Sub-popover (popover inside popover)

When a popover triggers another popover, set `stopOutsideClickPropagation: true` on the *inner* surface — otherwise an outside-click on the inner closes both.

```tsx
Popover.surface({
  open: innerOpen,
  onHide: closeInner,
  stopOutsideClickPropagation: true,
})
```

## Anchor placement: choosing `top-start` vs `top` vs `top-end`

- `top` / `bottom` — centered on the anchor's cross-axis
- `top-start` / `top-end` — aligned to the anchor's start/end edge
- `*-start` follows reading direction (LTR → left edge, RTL → right edge)

For menus that drop down from a leftmost trigger, `bottom-start` is almost always correct.

## Common pitfalls

- **Forgetting `cleanup()` from `anchor()`** — leaks resize/scroll listeners. Always call it in your unmount handler (or skip the manual API and use `Popover.anchor(...)` which manages this).
- **Setting `open: true` without `onHide`** — the popover can never close. The `onHide` callback is required for both Escape and outside-click.
- **Applying surface styles via `<style>`** — fights the positioning. Use `Popover.surfaceStyle` or `Popover.contentStyle` mixins (or `css({...})` composed in `mix={[]}`).
- **Tooltip without `role="tooltip"`** — assistive tech can't find it. Set the role on the surface element; the framework doesn't infer it.
