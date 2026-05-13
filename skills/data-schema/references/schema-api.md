# Data Schema API

## Primitives

```ts
s.string()
s.number()
s.boolean()
s.bigint()
s.symbol()
s.null_()
s.undefined_()
s.any()
s.unknown()
s.never()
```

## Literals & enums

```ts
s.literal('admin')                   // exactly the string 'admin'
s.literal(42)                        // exactly 42

s.enum_(['draft', 'review', 'live']) // one of these strings
```

## Combinators

```ts
s.array(s.string())
s.tuple([s.string(), s.number()])
s.record(s.string(), s.number())
s.set(s.string())
s.map(s.string(), s.number())

s.object({ id: s.number(), name: s.string() }, { unknownKeys: 'strip' })
//   'strip'        — drop unknown keys (default)
//   'passthrough'  — keep them
//   'error'        — fail on unknown

s.union([s.literal('a'), s.literal('b')])      // discriminated by value
s.variant('type', {
  ok:    s.object({ ok: s.literal(true) }),
  error: s.object({ ok: s.literal(false), reason: s.string() }),
})
```

## Modifiers

```ts
s.optional(s.string())     // T | undefined
s.nullable(s.string())     // T | null
s.defaulted(s.string(), '')

s.lazy(() => Tree)         // for recursive schemas
```

## Piping checks

```ts
import { minLength, maxLength, min, max, email, regex, uuid, url } from 'remix/data-schema/checks'

s.string().pipe(minLength(1), maxLength(100))
s.number().pipe(min(0), max(1_000_000))
s.string().pipe(email())
s.string().pipe(regex(/^[A-Z]{3}$/, 'must be 3 uppercase letters'))
s.string().pipe(uuid())
s.string().pipe(url())
```

`.pipe(...checks)` composes checks left-to-right. They run after the type check passes.

## Custom logic — `.refine`

```ts
const Even = s.number().refine(
  (n) => n % 2 === 0,
  'must be even',
)
```

`.refine(predicate, message)` adds a check that fails when `predicate` returns false.

## Transforms — `.transform`

```ts
const Trimmed = s.string().transform(s => s.trim())
const AsDate  = s.string().transform(s => new Date(s))
```

Transforms run after validation succeeds and change the output type.

## `parse` / `parseSafe`

```ts
const value = s.parse(schema, input)                // throws ValidationError
const result = s.parseSafe(schema, input)
if (!result.success) {
  // result.issues: Array<{ path, message, code? }>
}
const value = result.value
```

Both accept an options object:

| Option     | Notes                                                          |
|-----------|----------------------------------------------------------------|
| `errorMap`| `(issue) => string` — customise messages                       |
| `path`    | Prepend a path prefix (useful when validating a sub-fragment)  |

## Standard Schema v1 interop

Any schema implementing `~standard` works as input to `parse`/`parseSafe` — so Zod or Valibot schemas drop in unchanged. The reverse holds: `remix/data-schema` schemas can be used wherever a Standard Schema v1 schema is expected.
