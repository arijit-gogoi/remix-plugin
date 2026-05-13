---
name: remix-migrations
description: Schema migrations in Remix v3 — defining up/down functions with createMigration, using the schema DDL (createTable, alterTable, dropTable, createIndex, addForeignKey), loading and running migrations with the migration runner, and the conventions for migration filenames and directory layout. Load when the user is creating, applying, or rolling back a migration.
---

# Migrations

Migrations live alongside the data-table package. Each migration exports a default `createMigration({ up, down })`. The runner loads files in order, tracks applied versions, and applies new ones in a transaction (when the adapter supports `transactionalDdl`).

## Imports

```ts
import { createMigration, column as c } from 'remix/data-table/migrations'
import { table } from 'remix/data-table'
import { createMigrationRunner } from 'remix/data-table/migrations'
import { loadMigrations } from 'remix/data-table/migrations/node'
```

## Filename convention

```
db/migrations/
├── 20260101120000_create_users.ts
├── 20260115083000_add_orders.ts
└── 20260228090000_create_bookstore_schema.ts
```

The leading timestamp is the migration version. The runner sorts by version and applies in ascending order.

## A migration file

```ts
// db/migrations/20260228090000_create_bookstore_schema.ts
import { column as c, createMigration } from 'remix/data-table/migrations'
import { table } from 'remix/data-table'

export default createMigration({
  async up({ schema }) {
    const books = table({
      name: 'books',
      columns: {
        id:             c.integer().primaryKey().autoIncrement(),
        slug:           c.text().notNull().unique(),
        title:          c.text().notNull(),
        author:         c.text().notNull(),
        description:    c.text().notNull(),
        price:          c.decimal(10, 2).notNull(),
        genre:          c.text().notNull(),
        cover_url:      c.text().notNull(),
        image_urls:     c.text().notNull(),
        isbn:           c.text().notNull(),
        published_year: c.integer().notNull(),
        in_stock:       c.boolean().notNull(),
      },
    })
    await schema.createTable(books)

    const users = table({
      name: 'users',
      columns: {
        id:            c.integer().primaryKey().autoIncrement(),
        email:         c.text().notNull().unique(),
        password_hash: c.text().notNull(),
        name:          c.text().notNull(),
        role:          c.text().notNull(),
        created_at:    c.integer().notNull(),
      },
    })
    await schema.createTable(users)

    const orders = table({
      name: 'orders',
      columns: {
        id:         c.integer().primaryKey().autoIncrement(),
        user_id:    c.integer().notNull()
                      .references('users', 'id', 'orders_user_id_fk')
                      .onDelete('restrict'),
        total:      c.decimal(10, 2).notNull(),
        status:     c.text().notNull(),
        created_at: c.integer().notNull(),
      },
    })
    await schema.createTable(orders)
    await schema.createIndex('orders', 'user_id', { name: 'orders_user_id_idx' })
  },

  async down({ schema }) {
    await schema.dropTable('orders', { ifExists: true })
    await schema.dropTable('users',  { ifExists: true })
    await schema.dropTable('books',  { ifExists: true })
  },
})
```

## Schema DDL

The `schema` object inside `up` / `down`:

```ts
schema.createTable(tableDef, options?)
schema.dropTable(name, { ifExists })
schema.renameTable(from, to)
schema.alterTable(name, alter => {
  alter.addColumn('avatar_url', c.text())
  alter.dropColumn('legacy_field')
  alter.renameColumn('full_name', 'name')
})
schema.createIndex(table, columns, { name?, unique? })
schema.dropIndex(name)
schema.addForeignKey(table, columns, foreign, { name, onDelete })
schema.dropForeignKey(table, name)
```

## Wiring the runner

The runner discovers files, applies the pending ones, and stamps a `schema_migrations` table.

```ts
// db/migrate.ts
import path from 'node:path'
import { Pool } from 'pg'
import { createPostgresDatabaseAdapter } from 'remix/data-table-postgres'
import { createMigrationRunner } from 'remix/data-table/migrations'
import { loadMigrations } from 'remix/data-table/migrations/node'

const adapter = createPostgresDatabaseAdapter(
  new Pool({ connectionString: process.env.DATABASE_URL }),
)

const migrations = await loadMigrations(
  path.resolve('db/migrations'),
)

const runner = createMigrationRunner(adapter, migrations)

await runner.up()                 // apply all pending
// await runner.down({ steps: 1 })  // roll back the most recent
// await runner.status()            // show applied / pending
```

For SQLite the same shape:

```ts
import { DatabaseSync } from 'node:sqlite'
import { createSqliteDatabaseAdapter } from 'remix/data-table-sqlite'

const sqlite = new DatabaseSync('./db/app.sqlite')
const adapter = createSqliteDatabaseAdapter(sqlite)
const runner = createMigrationRunner(adapter, migrations)
await runner.up()
```

## Hooking into app startup

In dev, run migrations on boot so the schema is always live:

```ts
// app/data/setup.ts
export async function initializeAppDatabase() {
  // … create the adapter and runner …
  await runner.up()
  // … seed if empty …
}
```

```ts
// server.ts
await initializeAppDatabase()
const router = createBookstoreRouter()
```

In prod, run migrations as a deploy step instead (`bun run db/migrate.ts`).

## Adapter capabilities affect behaviour

- **Transactional DDL** (SQLite, Postgres): each migration runs inside a transaction; failed migrations are rolled back atomically.
- **Migration locks** (Postgres advisory locks, MySQL `GET_LOCK`): concurrent deploys can't apply the same migration twice.
- **Savepoints**: the runner uses savepoints for nested operations when available.

## Generating a new migration

The plugin ships a script:

```pwsh
bun run scripts/create-migration.ts --name add_reviews_table
# writes db/migrations/<timestamp>_add_reviews_table.ts with an empty up/down
```

## Further reading

- `references/ddl.md` — full DDL surface (createTable, alterTable, indexes, FKs)
- `references/runner.md` — `up`, `down`, `status`, `latest`, target-version semantics
- `references/strategies.md` — zero-downtime migration patterns (additive deploys, backfills, contracts)
- See also: [database](../database/SKILL.md)
