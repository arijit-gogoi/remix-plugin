# Error Handling

## `ValidationError`

Thrown by `s.parse(schema, input)` when validation fails.

```ts
import { ValidationError } from 'remix/data-schema'

try {
  const value = s.parse(schema, input)
} catch (err) {
  if (err instanceof ValidationError) {
    err.issues   // Array<Issue>
    err.message  // first issue, formatted
  }
  throw err
}
```

## `Issue` shape

```ts
type Issue = {
  path:    Array<string | number>
  message: string
  code?:   string            // 'invalid_type', 'too_small', 'too_big', etc.
  input?:  unknown           // the offending value, if known
}
```

`path` is the accessor chain: `['orders', 0, 'price']` means the `price` of the first order.

## `parseSafe` instead of try/catch

```ts
const result = s.parseSafe(schema, input)
if (!result.success) {
  // result.issues — same Issue[] you'd get on ValidationError
  return render(<Form errors={result.issues} />, { status: 400 })
}
const value = result.value
```

`parseSafe` is the right call inside controllers — `ValidationError` is for programmer-error situations, not user-input ones.

## Mapping errors to form fields

Group issues by the top-level path segment so the view can show them next to the right input:

```tsx
function errorsFor(issues: Issue[], field: string): string[] {
  return issues
    .filter((i) => i.path[0] === field)
    .map((i) => i.message)
}

<input name="email" />
{errorsFor(errors, 'email').map((m) => <p class="err">{m}</p>)}
```

## Customising messages — `errorMap`

```ts
s.parse(Credentials, input, {
  errorMap: (issue) => {
    if (issue.path.join('.') === 'age' && issue.code === 'too_small') {
      return 'Sorry, you must be at least 13.'
    }
    return issue.message
  },
})
```

`errorMap` is also accepted by `parseSafe`. It runs once per issue.

## When validation lives in a layer above controllers

For request-body validation that should *always* short-circuit with a 400, build a middleware:

```ts
import type { Middleware } from 'remix/fetch-router'

export function validateBody<T>(schema: s.Schema<T>): Middleware {
  return async (ctx, next) => {
    const formData = ctx.get(FormData)
    const result   = s.parseSafe(schema, formData)
    if (!result.success) {
      return Response.json({ issues: result.issues }, { status: 400 })
    }
    ctx.set(ValidatedBody, result.value)   // a project-local Key<T>
    return next()
  }
}
```

This is overkill for HTML forms (you usually want to re-render with errors), but neat for JSON APIs.
