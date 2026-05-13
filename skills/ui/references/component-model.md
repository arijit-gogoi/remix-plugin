# Component Model — Handle, setup, render

Remix UI components are functions that take a `Handle<Props>` and return a render function. The function body is the **setup phase** (runs once); the returned function is the **render phase** (runs every update).

## The function signature

```tsx
import type { Handle } from 'remix/ui'

type CounterProps = { start?: number }

export function Counter(handle: Handle<CounterProps>) {
  // ── setup phase ──
  let count = handle.props.start ?? 0
  function increment() {
    count += 1
    handle.update()
  }

  // ── render phase (returned function) ──
  return () => (
    <button mix={on('click', increment)}>Count: {count}</button>
  )
}
```

Each `handle.update()` reruns the render function in this component's subtree. Setup never reruns for the same component instance.

## `Handle<Props>` API

| Member            | Type                                | Notes                                |
|-------------------|-------------------------------------|--------------------------------------|
| `props`           | `Props`                             | Current props. Read in setup or render. |
| `update()`        | `() => void`                         | Mark this component dirty.            |
| `onProps(cb)`     | `(props: Props) => void`             | Run when props change from above.     |
| `onUnmount(cb)`   | `() => void`                         | Cleanup hook.                         |
| `ref<T>()`        | `() => Ref<T>`                       | Refs to DOM nodes.                    |

## Reacting to prop changes

Because setup runs only once, prop changes don't automatically flow into setup-scope vars. Wire them with `onProps`:

```tsx
export function Greeting(handle: Handle<{ name: string }>) {
  let name = handle.props.name

  handle.onProps((props) => {
    name = props.name
    handle.update()
  })

  return () => <p>Hi, {name}</p>
}
```

## Cleanup

```tsx
export function TimerBadge(handle: Handle<{}>) {
  let seconds = 0
  const id = setInterval(() => { seconds++; handle.update() }, 1000)
  handle.onUnmount(() => clearInterval(id))
  return () => <span>{seconds}s</span>
}
```

## Refs

```tsx
import type { Handle } from 'remix/ui'

export function Autofocus(handle: Handle<{}>) {
  const inputRef = handle.ref<HTMLInputElement>()
  handle.onMount(() => inputRef.current?.focus())
  return () => <input ref={inputRef} />
}
```

`handle.onMount(...)` runs after the DOM is wired up — that's the moment refs are populated.

## Composition

Components compose by being elements in another component's JSX:

```tsx
export function Page() {
  return () => (
    <main>
      <Header />
      <Counter start={5} />
      <Footer />
    </main>
  )
}
```

Each child has its own setup and render phases, independent of the parent.

## When in doubt: think two phases

React habit: imagine the function body reruns on every state change. Drop that. Setup runs once. The returned function is what reruns when *you* say so.

Need to do something every render? Put it inside the returned function. Need to do something once at mount? Put it in setup.
