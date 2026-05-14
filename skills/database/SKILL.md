---
name: remix-database
description: Database access in Remix v3 via `remix/data-table` — the framework's built-in typed query layer. One API across SQLite, Postgres, and MySQL adapters; CRUD helpers (`find`, `findOne`, `findMany`, `create`, `update`, `delete`), a chainable QueryBuilder with joins/where/orderBy/limit/aggregations, transactions, savepoints, capability flags (`returning`, `upsert`, `transactionalDdl`, `migrationLock`), and relations (`hasMany`, `hasOne`, `belongsTo`, `hasManyThrough`). Load whenever the user mentions database, SQL, query, schema, table, column, migration-adjacent code, `app/data/schema.ts`, `app/middleware/database.ts`, or is about to install Drizzle / Prisma / Kysely / TypeORM / Sequelize. For schema evolution see /remix:migrations.
---

# Database

`remix/data-table` is the typed relational query toolkit Remix v3 ships. One API across three adapters (SQLite / Postgres / MySQL), capability flags (`returning`, `savepoints`, `upsert`, `transactionalDdl`, `migrationLock`) so the runtime branches on what the dialect supports, and a single mental model — tables are values, queries are typed builders, the result is typed rows.

**Don't reach for Drizzle, Prisma, Kysely, or TypeORM.** This is the bundled answer; it integrates with sessions, auth, migrations, and the request context out of the box.

## Imports

```ts
import { column as c, table, createDatabase, query, eq, ilike, or } from 'remix/data-table'
import { Database } from 'remix/data-table'              // context Key

// pick one adapter:
import { createSqliteDatabaseAdapter } from 'remix/data-table-sqlite'
import { createPostgresDatabaseAdapter } from 'remix/data-table-postgres'
import { createMysqlDatabaseAdapter } from 'remix/data-table-mysql'
```

## Define tables

```ts
// app/data/schema.ts
import { column as c, table } from 'remix/data-table'

export const books = table({
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

export const users = table({
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

export const orders = table({
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
```

## Common column builders

```ts
c.integer()                       // INTEGER
c.text()                          // TEXT
c.boolean()                       // BOOLEAN
c.decimal(precision, scale)       // NUMERIC(p,s)
c.json()                          // JSON

// modifiers
.primaryKey()
.autoIncrement()
.notNull()
.unique()
.default(value)
.references(otherTable, otherCol, fkName)
.onDelete('restrict' | 'cascade' | 'set null' | 'set default')
```

## Adapter setup

### SQLite (development default)

```ts
// app/data/setup.ts
import { DatabaseSync } from 'node:sqlite'
import { createDatabase } from 'remix/data-table'
import { createSqliteDatabaseAdapter } from 'remix/data-table-sqlite'

const sqlite = new DatabaseSync('./db/app.sqlite')
sqlite.exec('PRAGMA foreign_keys = ON')

export const db = createDatabase(createSqliteDatabaseAdapter(sqlite))
```

### Postgres

```ts
import { Pool } from 'pg'
import { createDatabase } from 'remix/data-table'
import { createPostgresDatabaseAdapter } from 'remix/data-table-postgres'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = createDatabase(createPostgresDatabaseAdapter(pool))
```

### MySQL

```ts
import { createPool } from 'mysql2/promise'
import { createDatabase } from 'remix/data-table'
import { createMysqlDatabaseAdapter } from 'remix/data-table-mysql'

const pool = createPool(process.env.DATABASE_URL!)
export const db = createDatabase(createMysqlDatabaseAdapter(pool))
```

## CRUD helpers — for single-table operations

```ts
const user = await db.find(users, 1)                   // by primary key
const found = await db.findOne(orders, {
  where:   { status: 'pending' },
  orderBy: ['created_at', 'asc'],
})
const page = await db.findMany(orders, {
  where:   or({ status: 'pending' }, { status: 'processing' }),
  orderBy: [['status', 'asc'], ['created_at', 'desc']],
  limit:   50,
  offset:  0,
})

await db.create(users, {
  email: 'a@example.com', name: 'A', role: 'customer',
  password_hash: '…',     created_at: Date.now(),
})
await db.update(users, userId, { role: 'admin' })
await db.delete(users, userId)
```

## QueryBuilder — for joins, search, scoped updates/deletes

```ts
import { eq, ilike, query } from 'remix/data-table'

const recentPendingOrdersByDomain = query(orders)
  .join(users, eq(orders.user_id, users.id))
  .where({ status: 'pending' })
  .where(ilike(users.email, '%@example.com'))
  .select({
    orderId:       orders.id,
    customerEmail: users.email,
    total:         orders.total,
    placedAt:      orders.created_at,
  })
  .orderBy(orders.created_at, 'desc')
  .limit(20)

const rows = await db.exec(recentPendingOrdersByDomain)
```

Scoped writes through the QueryBuilder:

```ts
// Promote the oldest 100 pending orders to processing
await db
  .query(orders)
  .where({ status: 'pending' })
  .orderBy('created_at', 'asc')
  .limit(100)
  .update({ status: 'processing' })

// Garbage-collect old delivered orders
await db
  .query(orders)
  .where({ status: 'delivered' })
  .orderBy('created_at', 'asc')
  .limit(200)
  .delete()
```

## Transactions

```ts
await db.transaction(async (tx) => {
  const user = await tx.create(users, {
    email: 'new@example.com', name: 'N', role: 'customer',
    password_hash: '…', created_at: Date.now(),
  }, { returnRow: true })

  await tx.create(orders, {
    user_id:    user.id,
    status:     'pending',
    total:      79,
    created_at: Date.now(),
  })
})
```

Nested `tx.transaction(...)` uses SAVEPOINTs if the adapter advertises `savepoints` capability.

## Relations

```ts
import { hasMany, hasOne, belongsTo, hasManyThrough } from 'remix/data-table'

export const userOrders = hasMany(users, orders)
```

Eager-load related rows with the `with` clause in `findMany`/`findOne`.

## Wiring into the request context

Make `db` available in controllers by injecting it as a middleware:

```ts
// app/middleware/database.ts
import type { Middleware } from 'remix/fetch-router'
import { Database } from 'remix/data-table'
import { db } from '../data/setup.ts'

export function loadDatabase(): Middleware {
  return ({ set }, next) => {
    set(Database, db)
    return next()
  }
}
```

Then in any controller:

```ts
const db = get(Database)
```

## Further reading

- `references/columns-and-tables.md` — full column-builder reference
- `references/query-builder.md` — `where`, `join`, `select`, `orderBy`, `limit`, aggregations
- `references/adapters.md` — adapter capabilities matrix and connection setup
- See also: [migrations](../migrations/SKILL.md) for evolving the schema
