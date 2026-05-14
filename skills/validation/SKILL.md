---
name: remix-validation
description: Input validation in Remix v3 via the built-in `remix/data-schema` package — Standard Schema v1 compatible, so Zod and Valibot schemas drop in if you want. Covers primitives (`s.string`, `s.number`, `s.boolean`, …), combinators (`s.object`, `s.array`, `s.union`, `s.literal`, `s.optional`, `s.nullable`, `s.defaulted`, `s.lazy`), piped checks from `remix/data-schema/checks` (`min`, `max`, `minLength`, `maxLength`, `email`, `regex`, `uuid`, `url`) plus custom `.refine()` / `.transform()`, `parse` (throws `ValidationError`) vs `parseSafe` (returns `{ success, value | issues }`), form-data helpers from `remix/data-schema/form-data` (`f.object`, `f.field`, `f.fields`), and coercion from `remix/data-schema/coerce` (`number()`, `boolean()`, `date()`, etc.). Load whenever the user is validating form input, query params, JSON bodies, environment variables, or about to install Zod / Valibot / Yup / Joi / ajv / superstruct / arktype. Also load if they ask "what validation library should I use in Remix?".
---

# Validation

**Don't install Zod or Valibot in a Remix v3 project.** The framework ships its own validator at `remix/data-schema` — it's Standard Schema v1 compatible (so Zod/Valibot schemas drop in if you ever need them), sync-first, and zero extra deps.

`remix/data-schema` is the right answer for form data, URL search params, JSON bodies, env vars — anywhere untrusted input enters.

## Imports

```ts
import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'
import { minLength, maxLength, email, min, max, regex } from 'remix/data-schema/checks'
import * as coerce from 'remix/data-schema/coerce'
```

`s` is the core: primitives, objects, unions. `f` is the FormData/URLSearchParams adapter. `checks` are reusable `.pipe()` validations. `coerce` turns strings into numbers/booleans/dates.

## Building blocks

```ts
s.string()
s.number()
s.boolean()
s.bigint()
s.symbol()
s.null_()
s.undefined_()

s.array(s.string())
s.tuple([s.string(), s.number()])
s.record(s.string(), s.number())
s.set(s.string())
s.map(s.string(), s.number())

s.object({ id: s.number(), name: s.string() })
s.union([s.literal('a'), s.literal('b')])
s.variant('type', { ok: s.object({ ok: s.literal(true) }) })

s.optional(s.string())
s.nullable(s.string())
s.defaulted(s.string(), '')
s.lazy(() => Tree)
```

`s.object({...})` strips unknown keys by default. Override with `{ unknownKeys: 'passthrough' | 'error' }`.

## Piping checks

```ts
const Credentials = s.object({
  username: s.string().pipe(minLength(3), maxLength(20)),
  email:    s.string().pipe(email()),
  age:      s.number().pipe(min(13), max(130)),
})
```

Custom rule with `.refine`:

```ts
const Password = s.string().pipe(minLength(8)).refine(
  v => /[A-Z]/.test(v),
  'must contain an uppercase letter',
)
```

## `parse` vs `parseSafe`

```ts
// Throws ValidationError on failure — use when you want errors to bubble up.
const value = s.parse(Credentials, input)

// Returns a result — use when you want to re-render the form with issues.
const result = s.parseSafe(Credentials, input)
if (!result.success) {
  // result.issues is an array of { path, message }
  return render(<SignupPage errors={result.issues} />, { status: 400 })
}
const value = result.value
```

Both accept any Standard Schema v1 schema, so Zod or Valibot schemas drop in without translation.

## Validating FormData / URLSearchParams

`f.object` is the FormData/URLSearchParams root. `f.field` extracts a single value; `f.fields` extracts a repeated value. Strings are the natural input; use `coerce` to turn them into numbers, booleans, or dates.

```tsx
import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'
import * as coerce from 'remix/data-schema/coerce'
import { minLength } from 'remix/data-schema/checks'

const textField     = f.field(s.defaulted(s.string(), ''))
const passwordField = f.field(
  s.defaulted(
    s.union([s.literal(''), s.string().pipe(minLength(8))]),
    '',
  ),
)
const ageField = f.field(coerce.number().pipe(min(13)))

const settingsSchema = f.object({
  name:     textField,
  email:    textField,
  password: passwordField,
  age:      ageField,
})

export default {
  actions: {
    async update({ get }) {
      const formData = get(FormData)
      const { email, name, password, age } = s.parse(settingsSchema, formData)
      // … apply update
    },
  },
} satisfies Controller<typeof routes.account.settings>
```

## Re-rendering forms with issues

```tsx
async create({ get }) {
  const parsed = s.parseSafe(bookSchema, get(FormData))
  if (!parsed.success) {
    return render(<NewBookPage errors={parsed.issues} />, { status: 400 })
  }
  // … happy path
}
```

In the view, `errors` is an array of `{ path: string[], message: string }`. Filter by `path[0]` to attach an error to the right input.

## Customising error messages

Pass `errorMap` to `parse`/`parseSafe`:

```ts
s.parse(Credentials, input, {
  errorMap: (issue) =>
    issue.path.join('.') === 'age' ? 'Please enter a valid age' : issue.message,
})
```

## Notable checks

| Check                | Effect                                  |
|---------------------|-----------------------------------------|
| `minLength(n)` / `maxLength(n)` | string / array length                   |
| `min(n)` / `max(n)` | numeric bounds                          |
| `email()`           | RFC-5322 email format                   |
| `regex(/…/)`        | regex match                             |

## Further reading

- `references/schema-api.md` — full catalogue of primitives, combinators, and checks
- `references/form-data-helpers.md` — `f.object`, `f.field`, `f.fields`, coercion patterns
- `references/error-handling.md` — `ValidationError`, the `Issue` shape, error mapping
