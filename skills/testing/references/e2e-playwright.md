# End-to-End Tests with Playwright

For tests that need a real browser — drag/drop, file inputs that read disk, layout assertions, client-side interactivity — use `t.serve()` to expose your router on a real HTTP port and drive it with Playwright.

## Setup

```ts
import { describe, it } from 'remix/test'
import { createTestServer } from 'remix/node-fetch-server/test'
import { createBookstoreRouter } from './router.ts'
```

## A single test

```ts
describe('cart flow', () => {
  it('adds a book to the cart', async (t) => {
    const router = createBookstoreRouter()
    const page   = await t.serve(await createTestServer(router.fetch))

    await page.goto('/')
    await page.getByRole('link', { name: 'Books' }).click()

    const card = page.locator('[data-test="book-card"]').first()
    await card.getByRole('button', { name: 'Add to Cart' }).click()

    await page.getByRole('link', { name: /Cart \(1\)/ }).waitFor()
  })
})
```

`t.serve()`:
- Binds the server to a free port.
- Hands you a Playwright `Page` pointed at it.
- Tears down the server when the test ends.

## File discovery

By default `remix test` looks at `**/*.test{,.e2e}.{ts,tsx}`. Put e2e tests in `*.test.e2e.ts` files so you can run them separately when you want (`remix test "**/*.test.e2e.ts"`).

## Per-test isolation

Each e2e test gets its own router + server + page. State doesn't leak between tests — but it *does* persist within a test. If you need a clean DB, initialise an in-memory SQLite inside `createBookstoreRouter`:

```ts
import { createMemorySessionStorage } from 'remix/session/memory-storage'

const router = createBookstoreRouter({
  db: await initializeTestDatabase(),
  sessionStorage: createMemorySessionStorage(),
})
```

## Common Playwright patterns

```ts
// Find by accessible role (preferred — survives markup changes)
page.getByRole('button',     { name: 'Sign in' })
page.getByRole('link',       { name: 'Books' })
page.getByRole('textbox',    { name: 'Email' })

// Fill forms
await page.getByLabel('Email').fill('a@example.com')
await page.getByLabel('Password').fill('pw1234')
await page.getByRole('button', { name: 'Sign in' }).click()

// Wait for navigation
await page.waitForURL(/\/account/)

// Assert visible content
await expect(page.getByText(/Welcome back/)).toBeVisible()

// File upload
await page.getByLabel('Cover').setInputFiles('./fixtures/cover.png')
```

## Headed vs headless

By default the runner is headless. Pass options to `t.serve` for debugging:

```ts
const page = await t.serve(server, { headless: false, slowMo: 100 })
```

## Network mocking inside a Playwright test

Mock at the *router* level (with `t.mock.method`) when you want to avoid hitting external services. Mock at the *Playwright* level when you specifically want to intercept browser-issued requests:

```ts
await page.route('https://stripe.com/**', (route) => route.fulfill({
  status: 200,
  body: JSON.stringify({ paid: true }),
}))
```

## Speed

E2E tests are 10–100× slower than integration tests. Use them sparingly — for the critical happy paths and any user-visible flow that integration tests can't validate (e.g. anything that depends on real CSS layout).
