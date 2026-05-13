# Mocks, Fake Timers, and Cleanup

The test context `t` (passed to every `it(name, async (t) => …)`) carries the mocking and lifecycle utilities. Mocks reset automatically between tests.

## Function mocks — `t.mock.fn(impl?)`

```ts
it('calls the notifier on success', async (t) => {
  const notify = t.mock.fn<(userId: number) => Promise<void>>()
  const router = await createTestRouter({ notify })

  await router.fetch('https://app.test/login', { /* … */ })

  assert.equal(notify.mock.calls.length, 1)
  assert.equal(notify.mock.calls[0].arguments[0], 42)
})
```

`t.mock.fn(impl)` accepts an implementation; without one, it returns `undefined` from every call.

## Method spies — `t.mock.method(target, name, impl?)`

Stub a method on an existing object without replacing the whole module:

```ts
it('fetches the Okta userinfo', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async (input) => {
    const url = String(input)
    if (url.endsWith('/oauth/token')) {
      return new Response(JSON.stringify({ access_token: 'tok', token_type: 'Bearer' }))
    }
    if (url.endsWith('/userinfo')) {
      return new Response(JSON.stringify({ sub: 'u1', email: 'a@example.com' }))
    }
    throw new Error(`unexpected fetch: ${url}`)
  })

  // … drive the callback flow

  // Inspect the calls
  assert.equal(fetchMock.mock.calls.length, 2)
  fetchMock.mock.restore()       // (auto-restores at test end, but explicit also OK)
})
```

## Fake timers

```ts
it('expires the reset token after 30 minutes', async (t) => {
  t.mock.timers.enable()
  t.after(() => t.mock.timers.disable())

  const token = await createResetToken('user@example.com')
  t.mock.timers.tick(30 * 60 * 1000 + 1)

  const result = await consumeResetToken(token)
  assert.equal(result, null)
})
```

`t.mock.timers` patches `setTimeout`, `setInterval`, `Date.now`, and friends.

## Cleanup hooks — `t.after`, `t.before`

```ts
it('writes to a temp dir', async (t) => {
  const dir = await mkdtemp('test-')
  t.after(() => fs.rm(dir, { recursive: true }))

  // … use `dir`
})
```

`t.before(...)` runs before any of this test's body (similar to `beforeEach` but scoped to a single test). `t.after(...)` runs after — even if the body throws.

## `beforeEach` / `afterEach` for a whole describe block

```ts
describe('account', () => {
  let router: Router

  beforeEach(async () => {
    router = await createTestRouter()
  })

  it('renders the dashboard', async () => { /* … */ })
  it('updates settings',      async () => { /* … */ })
})
```

## Replacing modules entirely

Sometimes the unit-under-test imports something that's painful to stub. Use a factory pattern: pass dependencies in rather than importing them.

```ts
// Good — easy to test
export function createSettingsController(deps: { db: Database; emailer: Emailer }) {
  return { actions: { /* uses deps.db / deps.emailer */ } }
}

// Hard — direct import is a singleton you can't swap
import { db } from '../data/setup.ts'
import { emailer } from '../utils/emailer.ts'
export default { /* uses db and emailer */ }
```

## Asserting on call arguments

```ts
assert.equal(mock.mock.calls.length, 3)
assert.deepEqual(mock.mock.calls[0].arguments, ['hello', { retries: 2 }])

// Returned values
assert.equal(mock.mock.calls[0].result, expected)
```
