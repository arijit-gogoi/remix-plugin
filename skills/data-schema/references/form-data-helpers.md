# FormData & URLSearchParams Helpers

Imported from `remix/data-schema/form-data` (`f`). These adapt the core schema API to the string-based world of HTML forms and query strings.

## `f.object(shape, options?)`

Root schema for a `FormData` or `URLSearchParams`.

```ts
const schema = f.object({
  email:    f.field(s.string().pipe(email())),
  remember: f.field(coerce.boolean()),
})

const value = s.parse(schema, request.formData())
```

Just like `s.object`, the default behaviour strips unknown fields.

## `f.field(schema, options?)`

A single value. If the field is present more than once, only the first is read.

```ts
f.field(s.string())
f.field(s.defaulted(s.string(), ''))     // empty becomes ''
f.field(coerce.number())                  // turns '42' into 42
```

`options`:

| Option       | Notes                                            |
|-------------|--------------------------------------------------|
| `whenMissing`| `'undefined'` (default) \| `'null'` \| literal  |

## `f.fields(schema)`

A repeated value (e.g. `<select multiple>` or `<input type="checkbox" name="tag">` repeated).

```ts
f.fields(s.string())     // string[]
f.fields(coerce.number())
```

## Coercion — `remix/data-schema/coerce`

The coercion helpers are **self-contained schemas**, not wrappers. Each one returns `Schema<unknown, T>` directly.

```ts
import * as coerce from 'remix/data-schema/coerce'

coerce.string()    // accepts strings as-is
coerce.number()    // '42' → 42 (finite numbers only, rejects NaN/Infinity)
coerce.boolean()   // 'true' | 'false' → boolean (case-insensitive, trimmed)
coerce.bigint()    // accepts bigint, int number, or integer string
coerce.date()      // accepts Date or parseable date string
```

To layer extra validation on top of a coerced value, use `.pipe(...)` on the result:

```ts
const adult = coerce.number().pipe(min(18))
```

## Real-world example

```tsx
import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'
import * as coerce from 'remix/data-schema/coerce'
import { email, min, minLength } from 'remix/data-schema/checks'

const signupSchema = f.object({
  email:      f.field(s.string().pipe(email())),
  password:   f.field(s.string().pipe(minLength(8))),
  age:        f.field(coerce.number().pipe(min(13))),
  newsletter: f.field(coerce.boolean()),
  interests:  f.fields(s.string()),       // multi-select
})

// In a controller:
const parsed = s.parseSafe(signupSchema, get(FormData))
if (!parsed.success) {
  return render(<SignupPage errors={parsed.issues} />, { status: 400 })
}
const { email, password, age, newsletter, interests } = parsed.value
```

## Checkbox semantics

Browsers omit unchecked checkboxes entirely from form data. With `coerce.boolean()`, an absent field reads as `undefined` — wrap with `s.defaulted(...)` if you want a `false` default:

```ts
newsletter: f.field(s.defaulted(coerce.boolean(), false)),
```

## File fields

If the form is multipart and `formData()` middleware ran with an `uploadHandler`, the corresponding field contains a `File`-like:

```ts
f.field(s.unknown())   // accept whatever the upload handler returned
// then narrow yourself: `value instanceof File`
```

For validated file input (e.g. enforce content-type), check after parsing:

```ts
const { cover } = s.parse(schema, get(FormData))
if (!(cover instanceof File) || !cover.type.startsWith('image/')) {
  return render(<NewBookPage errors={[{ path: ['cover'], message: 'Image required' }]} />, { status: 400 })
}
```
