# Migration Runner

The runner discovers migrations, tracks which ones have been applied (`schema_migrations` table), and applies pending ones in order.

## Construction

```ts
import { createMigrationRunner } from 'remix/data-table/migrations'
import { loadMigrations } from 'remix/data-table/migrations/node'

const migrations = await loadMigrations(path.resolve('db/migrations'))
const runner = createMigrationRunner(adapter, migrations)
```

`loadMigrations(dir)` reads files from the directory, validates filenames against the `YYYYMMDDHHMMSS_name.ts` pattern, and imports them. Files that don't match the pattern are ignored with a warning.

## Operations

### `runner.up({ target? })`

Apply all pending migrations (or up to `target` version).

```ts
await runner.up()
await runner.up({ target: '20260228090000' })
```

Each migration runs in its own transaction when the adapter supports `transactionalDdl`. On failure, the transaction is rolled back and the runner stops — partial state never persists.

### `runner.down({ steps?, target? })`

Roll back the most recent migration(s). `steps` (default 1) controls how many; `target` rolls down to a version.

```ts
await runner.down()                  // roll back 1
await runner.down({ steps: 3 })
await runner.down({ target: '20260101000000' })
```

### `runner.status()`

Return a summary of applied vs pending:

```ts
const status = await runner.status()
// {
//   applied: [{ version: '20260101…', name: 'create_users',          appliedAt: 1714…  }, …],
//   pending: [{ version: '20260301…', name: 'add_reviews_table' }],
// }
```

Use it in CI to enforce "no unapplied migrations in main".

### `runner.latest()` / `runner.current()`

Sugar over `status`:

```ts
await runner.latest()        // version of the most recent file on disk
await runner.current()       // version of the most recent applied migration
```

## Locking

Adapters that advertise `migrationLock` capability (Postgres, MySQL) acquire a global lock at the start of `up`/`down`. Two concurrent deploys can't apply the same migration twice; the second waits for the first to finish.

SQLite has no cross-process locking; running migrations from multiple machines against the same SQLite file is unsafe (and unusual).

## Migration table schema

```
schema_migrations
├── version    TEXT PRIMARY KEY        -- '20260228090000'
├── name       TEXT NOT NULL           -- 'create_bookstore_schema'
├── applied_at INTEGER NOT NULL        -- ms epoch
└── checksum   TEXT                    -- of the file contents at apply time
```

`checksum` protects against silent edits. If you change an already-applied migration's contents and try to run again, the runner aborts.

## Wiring into app startup (dev)

```ts
// app/data/setup.ts
import { runner } from './migrate.ts'

export async function initializeAppDatabase() {
  await runner.up()
  // … optional seed
}
```

```ts
// server.ts
await initializeAppDatabase()
const router = createBookstoreRouter()
server.listen(3000)
```

## Wiring into deploy (prod)

Don't auto-migrate on app startup in prod — multiple instances will race (until the lock catches them). Run as a discrete step:

```pwsh
# in your deploy pipeline
bun run db/migrate.ts up
# only after success:
bun run server.ts
```

## CLI-style migrate script

```ts
// db/migrate.ts
import { argv } from 'node:process'
import { runner } from './runner.ts'

const cmd = argv[2] ?? 'up'

switch (cmd) {
  case 'up':     await runner.up();      break
  case 'down':   await runner.down();    break
  case 'status': console.log(await runner.status()); break
  default:       console.error(`unknown command: ${cmd}`); process.exit(1)
}
```

Run as `bun run db/migrate.ts up`.

## CI checks

A useful guard in CI: fail if `status().pending.length > 0` and the PR doesn't include a new migration file.

```ts
const { pending } = await runner.status()
if (pending.length > 0) {
  console.error(`Pending migrations: ${pending.map(p => p.version).join(', ')}`)
  process.exit(1)
}
```
