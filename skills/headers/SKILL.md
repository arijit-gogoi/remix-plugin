---
name: remix-headers
description: Typed HTTP header parsers in Remix v3 via remix/headers — Accept, AcceptEncoding, AcceptLanguage, CacheControl, ContentDisposition, ContentRange, ContentType, Cookie, IfMatch, IfNoneMatch, IfRange, Range, SetCookie, Vary. Each is a class with strongly-typed getters/setters that parses an RFC-shaped header string and lets you mutate it without string concatenation. Load when reading or building specific HTTP headers (content negotiation, caching, conditional requests, range requests, cookie attributes), parsing Accept-Language, or computing Vary headers.
---

# Headers

`remix/headers` is a library of RFC-typed header parsers. Stop writing `request.headers.get('cache-control')?.split(',').map(s => s.trim())…` and start using `new CacheControl(...)`.

## Imports

```ts
import {
  Accept, AcceptEncoding, AcceptLanguage,
  CacheControl, ContentDisposition, ContentRange, ContentType,
  Cookie, IfMatch, IfNoneMatch, IfRange, Range, SetCookie, Vary,
  parse, stringify,
} from 'remix/headers'
```

Every class implements `HeaderValue` — i.e. `toString()` produces the canonical string form, and constructors accept either a string or a structured init object.

## Most useful classes

### `Accept` — content negotiation

```ts
const accept = new Accept(request.headers.get('Accept') ?? '*/*')

if (accept.accepts('application/json')) {
  return Response.json(data)
}
if (accept.accepts('text/html')) {
  return createHtmlResponse(html`...`)
}
return new Response('Not acceptable', { status: 406 })
```

Methods: `.accepts(type)`, `.mediaTypes`, `.weights`, `.size`, `.toString()`.

### `AcceptLanguage` — i18n

```ts
const lang = new AcceptLanguage(request.headers.get('Accept-Language') ?? 'en')
const best = lang.match(['en', 'fr', 'de']) ?? 'en'
```

### `CacheControl` — caching directives

```ts
const cc = new CacheControl({
  public:  true,
  maxAge:  3600,
  sMaxage: 86400,
  staleWhileRevalidate: 60,
})

return new Response(body, {
  headers: { 'Cache-Control': cc.toString() },
})
```

Reading:

```ts
const cc = new CacheControl(response.headers.get('cache-control') ?? '')
if (cc.maxAge && cc.maxAge > 60) { /* cache it */ }
```

### `ContentDisposition` — file downloads

```ts
return new Response(buffer, {
  headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': new ContentDisposition({
      type:     'attachment',
      filename: 'report.pdf',
    }).toString(),
  },
})
```

Handles RFC 5987 filename encoding for non-ASCII names.

### `ContentType` — Content-Type with charset/boundary

```ts
const ct = new ContentType('text/html; charset=utf-8')
ct.type        // 'text/html'
ct.charset     // 'utf-8'
ct.boundary    // undefined
```

### `Range` / `ContentRange` — byte-range requests

For video streaming, resumable downloads, etc.:

```ts
const range = request.headers.get('range')
if (range) {
  const r = new Range(range)
  const [first] = r.ranges          // [{ start, end }]
  return new Response(file.slice(first.start, first.end + 1), {
    status: 206,
    headers: {
      'Content-Range': new ContentRange({
        unit:  'bytes',
        start: first.start,
        end:   first.end,
        size:  file.size,
      }).toString(),
    },
  })
}
```

### `Cookie` / `SetCookie`

Server-side parsing of inbound `Cookie:` headers and serialization of `Set-Cookie:` responses. For session/auth cookies, prefer `remix/cookie` (signed). These are for one-off cookie values.

```ts
const cookies = new Cookie(request.headers.get('cookie') ?? '')
const sessionId = cookies.get('session_id')

return new Response('OK', {
  headers: {
    'Set-Cookie': new SetCookie({
      name: 'consent',
      value: 'yes',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'Lax',
      secure: true,
    }).toString(),
  },
})
```

### `IfMatch` / `IfNoneMatch` — conditional requests

```ts
const inm = new IfNoneMatch(request.headers.get('if-none-match') ?? '')
if (inm.matches(currentEtag)) {
  return new Response(null, { status: 304 })
}
```

### `Vary` — cache-key control

```ts
const vary = new Vary(['Accept-Language', 'Accept-Encoding'])
return new Response(body, {
  headers: { Vary: vary.toString() },
})
```

## Raw parsing / stringification

For headers without a dedicated class, or for multi-value generic handling:

```ts
import { parse, stringify } from 'remix/headers'

const parsed = parse('foo=bar, baz=qux; param=value')
// → structured form

const back = stringify(parsed)
// → 'foo=bar, baz=qux; param=value'
```

## Why not just use `Headers`?

`Headers` is a flat string store. It can't tell you whether `'Accept: text/html, application/json;q=0.9'` lists JSON before HTML by weight, or what `'Cache-Control: max-age=3600, stale-while-revalidate=60'` decomposes to. Typed parsers do.

Use `Headers` for getting/setting raw values. Use these classes when the value's structure matters.

## Further reading

- [`references/typed-parsers.md`](./references/typed-parsers.md) — full per-class reference with init shapes and parse rules
- See also: [cookies](../cookies/SKILL.md) for signed session cookies, [middlewares](../middlewares/SKILL.md) for `compression()` which uses `AcceptEncoding` internally
