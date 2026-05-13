---
name: remix-testing
description: Testing in Remix v3 — the remix/test framework (describe/it/before/after, t.mock.fn, t.mock.method), remix/assert (preferred over node:assert), router-driven request/response tests via router.fetch(new Request(...)), createTestServer for HTTP-level tests, and Playwright e2e via t.serve(). Load when the user is writing or running tests, debugging test failures, or configuring `remix test`.
---

# Testing

`remix/test` ships its own runner, assertion library, mocking utilities, and an end-to-end harness that bridges to Playwright. Run it with `remix test`. Default discovery is `**/*.test{,.e2e}.{ts,tsx}`.

## Imports

```ts
import { describe, it, beforeAll, afterAll, beforeEach, afterEach } from 'remix/test'
import * as assert from 'remix/assert'
import { createTestServer } from 'remix/node-fetch-server/test'
```

Prefer `remix/assert` over `node:assert/strict` — the messages render more cleanly in the runner.

## Three kinds of tests

| Kind | What you drive                                  | When                                |
|------|-------------------------------------------------|-------------------------------------|
| Unit | A function or component in isolation             | Pure logic, schema validation       |
| Integration | `router.fetch(new Request(...))` against a configured router | Most of your auth, controller, DB tests |
| E2E  | Playwright `page.goto(...)` against `t.serve(...)` | Browser interactions, JS-driven UI |

## Integration tests — driving the router directly

This is the bread and butter of a Remix test suite. Build a `Request`, hand it to `router.fetch`, assert on the `Response`. No HTTP, no port binding.

```ts
import { describe, it } from 'remix/test'
import * as assert from 'remix/assert'
import { createTestRouter } from './test-helpers.ts'

describe('home page', () => {
  it('renders the welcome banner', async () => {
    const router = await createTestRouter()
    const response = await router.fetch('https://app.test/')

    assert.equal(response.status, 200)
    const html = await response.text()
    assert.match(html, /Welcome/)
  })
})
```

The test helper pattern — see `demos/social-auth/app/router.test.ts` — gives every test a clean DB and memory-backed session storage:

```ts
// test-helpers.ts
import { createMemorySessionStorage } from 'remix/session/memory-storage'
import { createSocialAuthRouter } from './router.ts'
import { initializeTestDatabase } from './data/setup.ts'

export async function createTestRouter() {
  const db = await initializeTestDatabase()      // sqlite in-memory
  return createSocialAuthRouter({
    db,
    sessionStorage: createMemorySessionStorage(),
  })
}
```

## Asserting on cookies, redirects, headers

```ts
it('logs in and redirects', async () => {
  const router = await createTestRouter()
  const body = new URLSearchParams({ email: 'a@example.com', password: 'pw1234' })

  const response = await router.fetch('https://app.test/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  assert.equal(response.status, 302)
  assert.equal(response.headers.get('Location'), '/account')

  const setCookie = response.headers.get('Set-Cookie')
  assert.ok(setCookie?.includes('__session='))
})
```

To persist a session across multiple requests, capture `Set-Cookie` from the first response and replay it as `Cookie` on the next:

```ts
const cookie = setCookie!.split(';')[0]
const followUp = await router.fetch('https://app.test/account', {
  headers: { Cookie: cookie },
})
```

## Mocks — `t.mock.fn`, `t.mock.method`

The test context `t` exposes mocking; mocks reset automatically after the test.

```ts
it('verifies user via Okta', async (t) => {
  const router = await createTestRouter()

  // Intercept network calls so the test doesn't reach the real Okta
  const fetchMock = t.mock.method(globalThis, 'fetch', async (input) => {
    if (String(input).includes('/oauth/token')) {
      return new Response(JSON.stringify({ access_token: 'fake' }))
    }
    if (String(input).includes('/userinfo')) {
      return new Response(JSON.stringify({ sub: 'u1', email: 'a@example.com' }))
    }
    throw new Error(`unexpected fetch: ${input}`)
  })

  // … drive the callback flow, assert outcomes
  assert.ok(fetchMock.mock.calls.length > 0)
})
```

## E2E with Playwright — `t.serve()` + `createTestServer`

For tests that need a real browser (drag/drop, layout, JS interactions), `t.serve()` hands a real HTTP port to Playwright.

```ts
import { describe, it } from 'remix/test'
import { createTestServer } from 'remix/node-fetch-server/test'
import { createBookstoreRouter } from './router.ts'

describe('cart flow', () => {
  it('adds a book to the cart', async (t) => {
    const router = createBookstoreRouter()
    const page = await t.serve(await createTestServer(router.fetch))

    await page.goto('/')
    await page.getByRole('link', { name: 'Books' }).click()
    const bookCard = page.locator('[data-test="book-card"]').first()
    await bookCard.getByRole('button', { name: 'Add to Cart' }).click()

    await page.getByRole('link', { name: /Cart \(1\)/ }).waitFor()
  })
})
```

`t.serve()` boots the server, returns a `Page`, and tears down after the test.

## Common test patterns

- **Reset DB before each test.** Either reopen an in-memory SQLite per test or run migrations against a temp file.
- **Use memory session storage in tests** so cookies are still produced but server state stays in-process.
- **Inject external dependencies** as router options. The bookstore router takes a `db` and a `sessionStorage` for exactly this reason.
- **Assert HTML loosely.** `assert.match(html, /…/)` survives small markup changes better than full snapshots.

## Running tests

```pwsh
remix test                  # all tests
remix test "**/auth/**"     # glob
remix test --watch
```

Tests run under Node's built-in test runner; you can still use `node --test` directly if you prefer.

## Further reading

- `references/router-fetch.md` — building Requests by hand, common patterns
- `references/mocks.md` — `t.mock.fn`, `t.mock.method`, fake timers, cleanup
- `references/e2e-playwright.md` — `t.serve`, Playwright config
- `references/test-helpers.md` — building a `createTestRouter` factory
