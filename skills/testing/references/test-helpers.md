# Test Helpers — building a `createTestRouter`

Every Remix test suite has a `test-helpers.ts` (or `app/test-utils.ts`) that produces a freshly-configured router for each test. Doing it right pays off enormously — every test gets clean state without boilerplate.

## Goals of the helper

1. Build a router whose middleware stack matches production *except* for storage backends.
2. Use in-memory SQLite or a temp file for the DB.
3. Use memory session storage so cookies still flow but state stays in-process.
4. Apply migrations and (optionally) seed.
5. Return the router for `router.fetch(...)` calls in tests.

## Shape

```ts
// app/test-helpers.ts
import { createMemorySessionStorage } from 'remix/session/memory-storage'
import { DatabaseSync } from 'node:sqlite'
import { createDatabase } from 'remix/data-table'
import { createSqliteDatabaseAdapter } from 'remix/data-table-sqlite'

import { createBookstoreRouter } from './router.ts'
import { applyMigrations } from './data/migrate.ts'
import { seedTestData } from './data/seed.ts'

export async function createTestRouter(opts: { seed?: boolean } = {}) {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON')
  const db = createDatabase(createSqliteDatabaseAdapter(sqlite))

  await applyMigrations(db)
  if (opts.seed) await seedTestData(db)

  return createBookstoreRouter({
    db,
    sessionStorage: createMemorySessionStorage(),
  })
}
```

The production `createBookstoreRouter` accepts overrides for exactly this reason.

## Per-test factory pattern

```ts
import { describe, it, beforeEach } from 'remix/test'
import { createTestRouter } from './test-helpers.ts'

describe('books', () => {
  let router: Router
  beforeEach(async () => { router = await createTestRouter({ seed: true }) })

  it('lists books', async () => {
    const r = await router.fetch('https://app.test/books')
    assert.equal(r.status, 200)
  })
})
```

`beforeEach` gives every `it` block a fresh DB + memory session.

## Authenticated requests helper

Repeating the login dance is noisy. Wrap it:

```ts
export async function loginAndGetCookie(router: Router, email: string, password = 'pw1234') {
  const r = await router.fetch('https://app.test/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ email, password }),
  })
  return r.headers.get('Set-Cookie')!.split(';')[0]
}
```

In tests:

```ts
it('shows the account page', async () => {
  const cookie = await loginAndGetCookie(router, 'a@example.com')
  const r = await router.fetch('https://app.test/account', {
    headers: { Cookie: cookie },
  })
  assert.equal(r.status, 200)
})
```

## Seeding test data

Keep seeds explicit and small. A single helper that creates the rows your test depends on:

```ts
export async function seedTestData(db: Database) {
  await db.create(users, {
    email: 'a@example.com',
    password_hash: await hashPassword('pw1234'),
    name: 'A',
    role: 'admin',
    created_at: Date.now(),
  })
  await db.create(books, { /* … */ })
}
```

Don't reuse production seeds — they're often large and irrelevant.

## Common pitfalls

- **Sharing one router across tests.** Mutations leak. Make each `beforeEach` build a new one.
- **Hitting real time.** Use `t.mock.timers` (or pass a clock dependency) when behaviour depends on timestamps.
- **Reading `process.env` directly inside the router.** Tests can't override it cleanly. Pass config in as options.
- **External services in tests.** Mock at the `globalThis.fetch` layer with `t.mock.method`.
