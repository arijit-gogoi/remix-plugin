# Columns & Tables — full reference

## `table({ name, columns, primaryKey? })`

```ts
import { column as c, table } from 'remix/data-table'

const users = table({
  name: 'users',
  primaryKey: ['id'],                 // optional — usually inferred from .primaryKey() on a column
  columns: {
    id:     c.integer().primaryKey().autoIncrement(),
    email:  c.text().notNull().unique(),
    name:   c.text().notNull(),
  },
})
```

`primaryKey` is only needed for composite keys:

```ts
const orderItems = table({
  name: 'order_items',
  primaryKey: ['order_id', 'book_id'],
  columns: {
    order_id: c.integer().notNull().references('orders', 'id', 'order_items_order_id_fk').onDelete('cascade'),
    book_id:  c.integer().notNull().references('books',  'id', 'order_items_book_id_fk').onDelete('restrict'),
    quantity: c.integer().notNull(),
  },
})
```

## Column types

| Builder           | SQL                                |
|-------------------|------------------------------------|
| `c.integer()`     | `INTEGER`                          |
| `c.text()`        | `TEXT`                             |
| `c.boolean()`     | `BOOLEAN` (or numeric on SQLite)   |
| `c.decimal(p,s)`  | `NUMERIC(p, s)`                    |
| `c.real()`        | `REAL` / `DOUBLE PRECISION`        |
| `c.json()`        | `JSON` / `JSONB` / `TEXT`          |
| `c.blob()`        | `BLOB`                             |
| `c.date()`        | `DATE`                             |
| `c.timestamp()`   | `TIMESTAMP`                        |

## Modifiers (chainable)

```ts
.primaryKey()
.autoIncrement()
.notNull()
.unique()
.default(value)                                        // literal or SQL expression
.references(table, column, fkName?)
.onDelete('restrict' | 'cascade' | 'set null' | 'set default')
.onUpdate('restrict' | 'cascade' | 'set null' | 'set default')
```

Foreign-key example with on-delete cascade:

```ts
const sessions = table({
  name: 'sessions',
  columns: {
    id:      c.text().primaryKey(),
    user_id: c.integer().notNull()
              .references('users', 'id', 'sessions_user_id_fk')
              .onDelete('cascade'),
  },
})
```

## Indexes

Indexes live in migrations, not in `table(...)`:

```ts
await schema.createIndex('orders', ['user_id', 'status'], {
  name: 'orders_user_status_idx',
  unique: false,
})
```

## Relations

```ts
import { hasMany, hasOne, belongsTo, hasManyThrough } from 'remix/data-table'

export const userOrders     = hasMany(users, orders)
export const orderUser      = belongsTo(orders, users)
export const userProfile    = hasOne(users, profiles)
export const userTags       = hasManyThrough(users, userTags, tags)
```

Eager-load in queries:

```ts
const ordersWithUser = await db.findMany(orders, {
  with: { user: orderUser },
})
```
