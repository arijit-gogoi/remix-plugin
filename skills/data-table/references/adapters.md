# Adapters

Three official adapters: SQLite, Postgres, MySQL. All implement the same interface but report different capability flags.

## Capability matrix

| Capability         | SQLite | Postgres | MySQL |
|--------------------|--------|----------|-------|
| `returning`        | ✓      | ✓        | ✗     |
| `savepoints`       | ✓      | ✓        | ✓     |
| `upsert`           | ✓      | ✓        | ✓     |
| `transactionalDdl` | ✓      | ✓        | ✗     |
| `migrationLock`    | ✗      | ✓        | ✓     |

`returning` controls whether `create(..., { returnRow: true })` is a single round-trip or a separate SELECT. `transactionalDdl` controls whether migrations roll back atomically on failure. `migrationLock` controls whether parallel deploys are safe (Postgres advisory locks, MySQL `GET_LOCK`).

## SQLite

```ts
import { DatabaseSync } from 'node:sqlite'
import { createDatabase } from 'remix/data-table'
import { createSqliteDatabaseAdapter } from 'remix/data-table-sqlite'

const sqlite = new DatabaseSync('./db/app.sqlite')
sqlite.exec('PRAGMA foreign_keys = ON')          // SQLite default is OFF
sqlite.exec('PRAGMA journal_mode = WAL')         // recommended for prod
sqlite.exec('PRAGMA synchronous = NORMAL')

export const db = createDatabase(createSqliteDatabaseAdapter(sqlite))
```

Uses Node 22+'s built-in `node:sqlite`. No extra deps.

## Postgres

```ts
import { Pool } from 'pg'
import { createDatabase } from 'remix/data-table'
import { createPostgresDatabaseAdapter } from 'remix/data-table-postgres'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
})

export const db = createDatabase(createPostgresDatabaseAdapter(pool))
```

The adapter takes a `pg.Pool`. Sizing tip: cap `max` at 1.5–2× your concurrent worker count, not higher.

## MySQL

```ts
import { createPool } from 'mysql2/promise'
import { createDatabase } from 'remix/data-table'
import { createMysqlDatabaseAdapter } from 'remix/data-table-mysql'

const pool = createPool({
  uri: process.env.DATABASE_URL!,
  connectionLimit: 20,
})

export const db = createDatabase(createMysqlDatabaseAdapter(pool))
```

## Detecting capabilities in code

```ts
import { Database } from 'remix/data-table'

if (db.adapter.capabilities.returning) {
  const user = await db.create(users, { … }, { returnRow: true })
} else {
  await db.create(users, { … })
  const user = await db.findOne(users, { where: { email: '…' } })
}
```

In practice the helpers (`db.create`, `db.update`) already branch on capability — you only need to inspect it for advanced queries.

## Connection lifecycle

The adapter owns the pool, not the `Database`. Tear down the pool yourself on shutdown:

```ts
process.on('SIGTERM', async () => {
  await pool.end()
  process.exit(0)
})
```
