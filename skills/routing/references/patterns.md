# Pattern Syntax

The string passed to `route('…')`, `get('…')`, etc. is a typed route pattern.

## Static segments

```
/about
/books/popular
```

Exact match. Trailing slashes are normalised away during matching.

## Named params — `:name`

```
/books/:slug
/users/:userId/posts/:postId
```

Match any single path segment. Available at `params.<name>` (typed as `string`).

## Wildcards — `*name`

Match the rest of the path (slashes included). Useful for assets and pass-through routes:

```
/assets/*path
```

`/assets/img/logo.png` produces `params.path = 'img/logo.png'`.

## Specificity sorting

When two patterns could match the same URL, the router prefers the more specific one:

| Pattern A      | Pattern B    | Winner |
|----------------|--------------|--------|
| `/books/new`   | `/books/:slug` | A |
| `/books/:slug` | `/books/*rest` | A |
| `/books/:slug` | `/:resource/:slug` | A |

Concrete segments beat params; params beat wildcards.

## Search params

Patterns may declare expected search params with `?key=value` syntax. The router still matches the URL even if the search param is absent — but the param shape is typed:

```
/search?q=
```

`url.searchParams.get('q')` is the typical way to read them inside a handler.

## Method binding

Patterns alone don't constrain the HTTP method. Use the verb helpers (`get`, `post`, …) or `form()` / `resources()` to pin verbs. A raw `route('/foo')` matches any method.
