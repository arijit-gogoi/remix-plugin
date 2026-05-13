# Driving the Router with `router.fetch`

`router.fetch(request)` is the single entry point. Build a `Request`, hand it in, get back a `Response`. No HTTP, no port, no Playwright.

## GET

```ts
const response = await router.fetch('https://app.test/books/the-pragmatic-programmer')

assert.equal(response.status, 200)
const html = await response.text()
assert.match(html, /Pragmatic Programmer/)
```

The hostname doesn't have to resolve — it's only used for URL parsing.

## POST a form

```ts
const body = new URLSearchParams({ email: 'a@example.com', password: 'pw1234' })

const response = await router.fetch('https://app.test/login', {
  method:  'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body,
})

assert.equal(response.status, 302)
assert.equal(response.headers.get('Location'), '/account')
```

## POST JSON

```ts
const response = await router.fetch('https://app.test/api/books', {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify({ title: 'New Book' }),
})
```

## Multipart upload

```ts
const formData = new FormData()
formData.set('title', 'Cover Test')
formData.set('cover', new File(['hello'], 'cover.png', { type: 'image/png' }))

const response = await router.fetch('https://app.test/admin/books', {
  method: 'POST',
  body:   formData,             // Request auto-sets the boundary header
})
```

## Following redirects across requests

Capture cookies and resubmit:

```ts
async function followLogin(router: Router) {
  const login = await router.fetch('https://app.test/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'a@example.com', password: 'pw' }),
  })
  const cookie = login.headers.get('Set-Cookie')!.split(';')[0]

  return async (url: string, init: RequestInit = {}) =>
    router.fetch(url, {
      ...init,
      headers: { ...init.headers, Cookie: cookie },
    })
}

const fetchWithSession = await followLogin(router)
const response = await fetchWithSession('https://app.test/account')
```

## Asserting on `Set-Cookie`

```ts
const cookie = response.headers.get('Set-Cookie') ?? ''
assert.match(cookie, /^__session=[A-Za-z0-9._-]+/)
assert.match(cookie, /HttpOnly/)
assert.match(cookie, /SameSite=Lax/)
```

## Testing CSRF / origin checks

Some middleware checks the `Origin` header. Set it on the Request:

```ts
const response = await router.fetch('https://app.test/api/transfer', {
  method:  'POST',
  headers: { 'Origin': 'https://attacker.test', 'Content-Type': 'application/json' },
  body:    '{}',
})
assert.equal(response.status, 403)
```

## Streaming responses

`response.body` is a `ReadableStream`. Read incrementally:

```ts
const reader = response.body!.getReader()
const chunks: string[] = []
const decoder = new TextDecoder()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  chunks.push(decoder.decode(value))
}
assert.match(chunks[0], /Loading…/)
assert.match(chunks.at(-1)!, /Top sellers/)
```

Useful for testing `<Frame>` boundaries.

## Performance

`router.fetch` runs in-process. A typical test takes single-digit milliseconds. Don't reach for HTTP-level harnesses unless you're testing Playwright e2e.
