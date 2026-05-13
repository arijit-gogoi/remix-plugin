# Typed Parsers — full reference

Every class in `remix/headers` follows the same shape:

```ts
class HeaderName implements HeaderValue {
  constructor(init?: string | InitObject)
  toString(): string
  // class-specific getters/setters
}
```

`init` can be the raw header string from the wire OR a structured object. `toString()` is what you put in a `Response`'s headers.

## `Accept`

```ts
constructor(init?: string | AcceptInit)
type AcceptInit = Iterable<string | [string, number]> | Record<string, number>
```

Members:
- `mediaTypes: string[]` — types in declaration order
- `weights: number[]` — corresponding q-values
- `size: number`
- `accepts(mediaType: string): boolean` — `'text/html'` matches `'text/*'`
- `[Symbol.iterator]()` — yields `[mediaType, q]` pairs

```ts
new Accept('text/html, application/json;q=0.9, */*;q=0.1').accepts('image/png')   // true
new Accept({ 'text/html': 1, 'application/json': 0.9 })
```

## `AcceptEncoding`

```ts
new AcceptEncoding('br, gzip;q=0.9, identity;q=0').prefers(['br', 'gzip'])   // 'br'
```

Useful for content-negotiated compression (`compression-middleware` does this internally).

## `AcceptLanguage`

```ts
new AcceptLanguage('en-US,en;q=0.9,fr;q=0.5').match(['en', 'fr', 'es'])   // 'en'
```

`match(available)` returns the best matching tag from `available`, or `null`. Honors language-tag prefix matching (`en-US` ↔ `en`).

## `CacheControl`

`CacheControlInit` (all optional):
```
maxAge, sMaxage, maxStale, minFresh, staleWhileRevalidate, staleIfError
public, private, noCache, noStore, noTransform
mustRevalidate, mustUnderstand, proxyRevalidate
onlyIfCached, immutable
```

```ts
new CacheControl({ public: true, maxAge: 3600 }).toString()
// → 'public, max-age=3600'

new CacheControl('no-cache, max-age=0').noCache   // true
```

## `ContentDisposition`

```ts
new ContentDisposition({
  type:     'attachment',          // or 'inline' or 'form-data'
  filename: 'report (final).pdf',  // RFC 5987 encoded if non-ASCII
  name:     'fieldName',           // for multipart form-data
}).toString()
// → 'attachment; filename="report (final).pdf"'
```

## `ContentRange`

```ts
new ContentRange({ unit: 'bytes', start: 0, end: 499, size: 1234 }).toString()
// → 'bytes 0-499/1234'

new ContentRange({ unit: 'bytes', size: 1234 }).toString()    // size-only
// → 'bytes */1234'
```

## `ContentType`

```ts
const ct = new ContentType('multipart/form-data; boundary=---xyz')
ct.type      // 'multipart/form-data'
ct.boundary  // '---xyz'

new ContentType({ type: 'text/html', charset: 'utf-8' }).toString()
// → 'text/html; charset=utf-8'
```

## `Cookie`

Parse inbound:

```ts
const cookies = new Cookie('session=abc; lang=en')
cookies.get('session')   // 'abc'
cookies.size             // 2
[...cookies]             // [['session', 'abc'], ['lang', 'en']]
```

## `SetCookie`

Construct outbound:

```ts
new SetCookie({
  name: 'session',
  value: 'abc',
  maxAge: 3600,
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'Lax',
  domain: 'example.com',
  partitioned: false,
}).toString()
```

`CookieProperties` covers every attribute in the spec.

## `IfMatch` / `IfNoneMatch`

```ts
new IfMatch('"v1", "v2"').matches('"v1"')              // true
new IfMatch('*').matches('"anything"')                  // true (wildcard)
new IfNoneMatch('W/"weak"').matches('"strong"')         // false
```

`W/"..."` weak etags follow the spec's weak-comparison rule.

## `IfRange`

Accepts either an etag or an HTTP-date string. Mostly used by clients resuming downloads.

## `Range`

```ts
const r = new Range('bytes=0-499, 1000-')
r.unit     // 'bytes'
r.ranges   // [{ start: 0, end: 499 }, { start: 1000, end: undefined }]
```

`end: undefined` means "to end of resource".

## `Vary`

```ts
new Vary(['Accept-Language', 'Accept-Encoding']).toString()
// → 'Accept-Language, Accept-Encoding'

new Vary('*')   // any header could vary
```

## `parse` / `stringify`

For headers without a dedicated class:

```ts
const parsed = parse('foo=bar, baz=qux; q=0.5')
// Array of { value, parameters } records

stringify(parsed) === 'foo=bar, baz=qux; q=0.5'
```

Useful for proprietary headers, link headers, or building a parser for a new spec yourself.

## Common pitfalls

- **Don't store parsed instances on the request context.** They're cheap to construct on demand and harder to serialise/cache.
- **Always `.toString()` before assigning to `Headers.set(...)`.** `Headers` only accepts strings — passing the instance directly gives you `[object Object]`.
- **Inbound parsing tolerates malformed input.** Expect `get(...)` to return `null` for absent values, not throw. Wrap construction in try/catch only if the header source is genuinely untrusted (e.g. proxy headers from a service you don't run).
