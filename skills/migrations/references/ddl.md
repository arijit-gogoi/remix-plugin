# DDL Reference

Inside a migration's `up` and `down`, you get a `schema` object. Every method is async because some adapters execute statements over the network.

## Tables

### `schema.createTable(tableDef, options?)`

```ts
const books = table({
  name: 'books',
  columns: { /* … */ },
})
await schema.createTable(books, {
  ifNotExists: false,
})
```

`tableDef` is the same shape you'd pass to `table({...})` in app code — re-use it.

### `schema.dropTable(name, options?)`

```ts
await schema.dropTable('books', { ifExists: true, cascade: false })
```

### `schema.renameTable(from, to)`

```ts
await schema.renameTable('books', 'titles')
```

## Columns

### `schema.alterTable(name, (alter) => …)`

```ts
await schema.alterTable('books', (alter) => {
  alter.addColumn('cover_url', c.text())
  alter.addColumn('subtitle',  c.text().notNull().default(''))
  alter.dropColumn('legacy_isbn')
  alter.renameColumn('full_name', 'name')
  alter.alterColumn('price', { type: c.decimal(12, 2), notNull: true })
})
```

Per-DB quirks:
- **SQLite**: column drops require a copy-and-replace under the hood. The DDL layer does this for you.
- **Postgres**: each `addColumn` with a default + `notNull` is rewritten to a multi-step migration that backfills first.
- **MySQL**: `renameColumn` requires the column type — pass it in `alter.renameColumn('old', 'new', c.text())`.

## Indexes

### `schema.createIndex(table, columns, options?)`

```ts
await schema.createIndex('orders', 'user_id', {
  name:   'orders_user_id_idx',
  unique: false,
})
await schema.createIndex('orders', ['user_id', 'status'], {
  name: 'orders_user_status_idx',
})
await schema.createIndex('orders', 'user_id', {
  name: 'orders_user_id_partial_idx',
  where: { status: 'pending' },     // partial index where adapter supports it
})
```

### `schema.dropIndex(name, options?)`

```ts
await schema.dropIndex('orders_user_id_idx', { ifExists: true })
```

## Foreign keys

The recommended path is to declare FKs on column definitions in `table({...})` — DDL adds them automatically when you `createTable`. But you can also add them after the fact:

```ts
await schema.addForeignKey('orders', 'user_id', {
  references: { table: 'users', column: 'id' },
  name:       'orders_user_id_fk',
  onDelete:   'restrict',
  onUpdate:   'cascade',
})

await schema.dropForeignKey('orders', 'orders_user_id_fk')
```

## Raw SQL

Sometimes you need DDL the abstraction doesn't cover (DB-specific extensions, triggers, partial GIN indexes on Postgres).

```ts
await schema.exec(/* sql */ `
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX books_title_trgm_idx ON books USING GIN (title gin_trgm_ops);
`)
```

`schema.exec` runs the SQL as-is. It's escape-hatch territory: lose dialect portability and structured rollback.

## Comments

```ts
await schema.alterTable('books', (alter) => {
  alter.setColumnComment('isbn', 'ISBN-13, no hyphens')
})
await schema.setTableComment('books', 'Library catalogue')
```

Supported on Postgres and MySQL; SQLite ignores comments silently.

## Common pitfalls

- **Don't refer to old column data inside the same migration's `up` after a drop.** If you need to backfill new from old, do that *before* the drop.
- **Don't mix DDL and large data backfills in one migration.** Split: migration A adds the column, migration B backfills in batches, migration C makes it `NOT NULL`. Keeps deploys reversible.
- **`ifExists` in `down` only.** In `up`, you want a failure if the named object is already there — that's a sign two migrations are out of sync.
