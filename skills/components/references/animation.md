# Animation — entrance, exit, layout, spring, tween

`remix/ui/animation` replaces Framer Motion, AutoAnimate, and similar libraries. Three mixins for declarative entrance/exit/layout transitions; two iterators (`spring`, `tween`) for hand-rolled animations.

## Imports

```ts
import {
  animateEntrance, animateExit, animateLayout,
  spring, tween, easings,
  type SpringOptions, type SpringPreset, type SpringIterator,
  type TweenOptions, type BezierCurve,
} from 'remix/ui/animation'
```

## The three mixins

### `animateEntrance(keyframes, options?)`

Run an animation when the element is first attached to the DOM. Slap it on the element you want to animate in.

```tsx
<div mix={animateEntrance({
  opacity:   [0, 1],
  transform: ['translateY(8px)', 'translateY(0)'],
})}>
  Hello
</div>
```

Keyframes are `{ property: [from, to] }` or `{ property: [step1, step2, ..., stepN] }`. The mixin uses Web Animations API under the hood.

`options` (when provided as a second argument): duration, easing, delay — the standard WAAPI shape. Defaults are sensible.

### `animateExit(keyframes, options?)`

Run an animation **before** the element detaches. Pair with `animateEntrance` for symmetry:

```tsx
<div mix={[
  animateEntrance({ opacity: [0, 1] }),
  animateExit({ opacity: [1, 0] }, { duration: 150 }),
]}>
```

The framework defers the actual DOM removal until the exit animation finishes. If a parent forces removal (e.g. its own exit), the exit is best-effort.

### `animateLayout(options?)`

FLIP-style layout transitions. When the element's bounding box changes (sibling added, list reordered, parent resized), animate from the previous box to the new one.

```tsx
{items.map((item) => (
  <div mix={animateLayout()} key={item.id}>{item.label}</div>
))}
```

This is the magic for reorderable lists, accordions expanding, sidebars resizing — places where Framer's `layout` prop would otherwise be reached for.

## Iterators: `spring` and `tween`

The mixins handle 90% of cases. When you need a custom animation loop (drag-to-dismiss, scroll-linked transforms, custom gestures), drop down to the iterators.

### `spring(options): SpringIterator`

```ts
import { spring } from 'remix/ui/animation'

const iter = spring({ from: 0, to: 100, stiffness: 200, damping: 20 })

let frameId: number
function step() {
  const { value, done } = iter.next()
  el.style.transform = `translateX(${value}px)`
  if (!done) frameId = requestAnimationFrame(step)
}
requestAnimationFrame(step)
```

`SpringOptions` typical fields: `from`, `to`, `stiffness`, `damping`, `mass`, `velocity`, plus an optional `SpringPreset` for named presets (e.g. `'snappy'`, `'gentle'`).

The iterator is RAF-friendly — call `.next()` once per frame, read `value`, stop when `done`.

### `tween(options): SpringIterator-like`

```ts
import { tween, easings } from 'remix/ui/animation'

const iter = tween({
  from: 0,
  to:   1,
  duration: 300,
  ease: easings.easeOutCubic,
})
```

Same loop shape as `spring`. `easings` exports named bezier presets. For custom curves, pass a `BezierCurve` (a four-number tuple).

## Common patterns

### Toast that slides in and out

```tsx
export function Toast(handle: Handle<{ message: string; show: boolean }>) {
  return () => handle.props.show ? (
    <div mix={[
      animateEntrance({
        opacity:   [0, 1],
        transform: ['translateY(100%)', 'translateY(0)'],
      }, { duration: 200 }),
      animateExit({
        opacity:   [1, 0],
        transform: ['translateY(0)', 'translateY(100%)'],
      }, { duration: 150 }),
    ]}>
      {handle.props.message}
    </div>
  ) : null
}
```

### Animated list reorder

```tsx
export function SortableList(handle: Handle<{ items: Item[] }>) {
  return () => (
    <ul>
      {handle.props.items.map((item) => (
        <li key={item.id} mix={[
          animateLayout({ duration: 250 }),
          animateEntrance({ opacity: [0, 1] }),
        ]}>
          {item.label}
        </li>
      ))}
    </ul>
  )
}
```

When `items` reorders, `animateLayout` springs each `<li>` from its previous position to its new one. `animateEntrance` handles newly added items.

### Spring-physics drag handle

```tsx
let x = 0
let velocity = 0

function startSpringTo(target: number) {
  const iter = spring({ from: x, to: target, velocity, stiffness: 220, damping: 24 })
  function tick() {
    const { value, done, velocity: v } = iter.next()
    x = value
    velocity = v
    el.style.transform = `translateX(${x}px)`
    if (!done) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
```

`spring` preserves velocity across calls — drag, release, and let physics carry it home.

## When NOT to use the animation module

- **Pure CSS transitions** (hover states, focus rings) — keep them in `css({...})` with `transition: 'all 0.15s'`. The animation module is for property keyframes, not state-driven transitions.
- **Continuous loops** (loading spinners, ambient effects) — use CSS keyframes or `<svg>` `<animate>`. The module is for discrete animations.
- **Scroll-linked animations** — better served by the Scroll-Linked Animations spec / `ScrollTimeline` than by running RAF.

## Pitfalls

- **Forgetting `animateExit` symmetry** — without it, elements pop out instantly while their siblings spring around them awkwardly. Pair entrance/exit.
- **`animateLayout` on tiny elements with sub-pixel positioning** — measurement error can produce jitter. Constrain animated elements to integer pixel positions where possible.
- **Long durations.** Defaults are short for a reason — UI animations over ~250ms feel sluggish. Reach for that range only for intentional moments (page transitions, hero reveals).
- **Animating layout-affecting properties at scale.** `width`, `height`, `margin` trigger reflow per frame. Prefer `transform` (`scale`, `translate`) for performance — same visual result, GPU-accelerated.
