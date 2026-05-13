# Safe HTML — full reference

## Escape semantics

`html\`...\`` escapes interpolated values according to whether they're inside attribute, text, or comment context. The exact transformations:

| Input | Output |
|---|---|
| `<` | `&lt;` |
| `>` | `&gt;` |
| `&` | `&amp;` |
| `"` | `&quot;` |
| `'` | `&#39;` |

These cover the OWASP "HTML entity encoding" rules. They're enough to prevent injection in standard text/attribute contexts. Not enough for:

- **JavaScript context** — interpolating user data inside a `<script>` body. Don't do this; pass data via `data-*` attributes and read in JS.
- **URL context** — interpolating user data into an `href` requires URL encoding (`encodeURIComponent`) in addition.
- **CSS context** — `<style>` blocks need CSS-specific escaping. Avoid; use stylesheets and class names.

## Interpolation types

```ts
type Interpolation =
  | SafeHtml
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<Interpolation>
```

- `string` → escaped
- `number` → coerced to string, no escaping needed (digits are safe)
- `boolean` → `'true'` / `'false'`
- `null` / `undefined` → empty string (so `${user.email ?? ''}` is unnecessary)
- `SafeHtml` → inserted as-is, **not re-escaped**
- `Array<Interpolation>` → recursively processed, joined without a separator

## The `SafeHtml` branded type

```ts
declare const kSafeHtml: unique symbol
type SafeHtml = String & { readonly [kSafeHtml]: true }
```

Branded so a regular `string` can't accidentally pass where `SafeHtml` is expected. The two ways to get a `SafeHtml`:

1. `html\`...\`` — escapes inputs
2. `html.raw\`...\`` — does NOT escape (use only with trusted content)

## Composition without double-escaping

```ts
const safe1 = html`<strong>${userName}</strong>`   // userName escaped
const safe2 = html`<p>${safe1}</p>`                  // safe1 NOT re-escaped
```

This is the property that makes the template tag useful for building documents from helpers.

## Array interpolation

```ts
const tags = ['<urgent>', 'bug', '<security>']
html`<ul>${tags.map((t) => html`<li>${t}</li>`)}</ul>`
// → '<ul><li>&lt;urgent&gt;</li><li>bug</li><li>&lt;security&gt;</li></ul>'
```

`tags` is escaped because each `<li>${t}</li>` runs through `html`. The outer interpolation receives `SafeHtml[]` and joins them.

## Common patterns

### Conditional fragments

```ts
const isAdmin = currentUser.role === 'admin'
html`
  <nav>
    <a href="/">Home</a>
    ${isAdmin ? html`<a href="/admin">Admin</a>` : ''}
  </nav>
`
```

Empty string and `null`/`undefined` all render to nothing — pick whichever reads best.

### Attribute interpolation

```ts
html`<input type="text" value="${userInput}" placeholder="${placeholder}">`
```

Quotes and the `<`/`>` inside attribute values are escaped — safe.

### Class lists

```ts
const classes = ['btn', isActive && 'btn-active', isLarge && 'btn-lg'].filter(Boolean).join(' ')
html`<button class="${classes}">${label}</button>`
```

Boolean-AND idiom keeps falsy classes out.

### Slot pattern

```ts
function card(props: { title: string; body: SafeHtml }) {
  return html`
    <article class="card">
      <h3>${props.title}</h3>
      <div class="body">${props.body}</div>
    </article>
  `
}

card({
  title: 'Hello',
  body: html`<p>This is <em>safe</em> ${userInput}</p>`,
})
```

`body` is typed as `SafeHtml` so callers can't pass a raw string by accident.

## When `html.raw` is correct

Three legitimate uses:

1. **Pre-escaped HTML from a trusted source.** E.g. content from your own DB that you've already sanitized with a server-side library (DOMPurify, sanitize-html). The library returns "this is safe HTML" and you trust it.
2. **Constants in your codebase.** Inline SVGs, MathML, icon snippets that ship with your app.
3. **Output from another templating engine** that already produces safe HTML.

Never:
- User input
- URL parameters
- Headers
- Database values that weren't explicitly sanitized before storage

## When NOT to use templates

- **Component-heavy pages with shared layout.** Use `remix/ui` JSX — composable, type-checked props, hydration.
- **Anything client-interactive.** Templates produce a string. JS doesn't hydrate it.

## TypeScript: ergonomic helpers

```ts
type Card = { title: string; subtitle?: string; body: SafeHtml }

function cardList(cards: Card[]): SafeHtml {
  return html`
    <div class="grid">
      ${cards.map((c) => html`
        <article>
          <h3>${c.title}</h3>
          ${c.subtitle ? html`<small>${c.subtitle}</small>` : ''}
          ${c.body}
        </article>
      `)}
    </div>
  `
}
```

Branded `SafeHtml` in the type means callers can't pass an unescaped string.
