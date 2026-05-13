# Migration Strategies — zero-downtime patterns

Schema changes split into two categories: **additive** (safe to deploy alongside old code) and **destructive** (require coordination). The trick to zero downtime is to do every destructive change as a sequence of additive ones.

## Additive changes

These can ship in one migration + one deploy:

- Adding a new table.
- Adding a new column that's nullable (or has a default).
- Adding a new index (concurrently in Postgres).
- Adding a new foreign key (when the data already complies).

## The "expand / migrate / contract" pattern

For destructive changes, deploy in 3 phases:

### Phase 1: expand

Add the new column/table. Old code continues to use the old schema; new code starts writing to both old and new.

```ts
// migration A
await schema.alterTable('users', (alter) => {
  alter.addColumn('name', c.text())           // nullable for now
})
```

```ts
// app code starts writing both
await db.update(users, id, { full_name: 'A', name: 'A' })
```

### Phase 2: migrate (data)

Backfill the new column from the old one in batches.

```ts
// migration B — data only, no DDL
for await (const batch of paginate(users, { batchSize: 1000 })) {
  for (const user of batch) {
    if (user.name !== user.full_name) {
      await db.update(users, user.id, { name: user.full_name })
    }
  }
}
```

Run this between deploys. App keeps working on both reads (`full_name`) and writes (both).

### Phase 3: contract

Drop the old column once nothing reads it.

```ts
// migration C
await schema.alterTable('users', (alter) => {
  alter.dropColumn('full_name')
})
```

Three migrations, three deploys, zero downtime. The pattern works for: renaming columns, splitting one column into many, merging columns, narrowing types.

## Renaming a column the wrong way

```ts
// DON'T do this in one migration if the app is live
alter.renameColumn('full_name', 'name')
```

Between the moment the migration runs and the moment new app code rolls out, *either* the old code is in production writing `full_name` (which doesn't exist anymore) *or* the new code is writing `name` (which doesn't exist yet). Either way, errors.

## Making a column NOT NULL

```ts
// Step 1: add as nullable
alter.addColumn('email_verified_at', c.integer())

// (in app code) populate it everywhere

// Step 2: backfill remaining rows
await db.query(users).where(isNull(users.email_verified_at)).update({ email_verified_at: Date.now() })

// Step 3: tighten the constraint
alter.alterColumn('email_verified_at', { notNull: true })
```

Skipping the backfill makes Step 3 fail loudly. Good.

## Foreign keys on existing tables

```ts
// Safe order:
// 1. Add the FK column (nullable)
alter.addColumn('user_id', c.integer())

// 2. Backfill from existing data

// 3. Add the constraint
schema.addForeignKey('orders', 'user_id', {
  references: { table: 'users', column: 'id' },
  name: 'orders_user_id_fk',
  onDelete: 'restrict',
})

// 4. Tighten to NOT NULL
alter.alterColumn('user_id', { notNull: true })
```

## Large indexes

On Postgres, `CREATE INDEX CONCURRENTLY` doesn't block writes. The DDL helper supports it:

```ts
await schema.createIndex('orders', 'created_at', {
  name: 'orders_created_at_idx',
  concurrent: true,
})
```

The runner notices `concurrent: true` and runs the index creation *outside* the transaction (because Postgres requires it). Failure isn't auto-rolled back — clean up manually if needed.

## Down migrations

In prod you rarely roll a migration back; you fix forward with another migration. Still, write a coherent `down` for every `up`: it's invaluable in CI and on staging.

The two paths diverge when data is involved. `up` may add a column and backfill it; `down` should drop the column (data loss is fine — that's the point of rolling back).

## When schema changes touch the hot path

For tables with high write volume:

- Use the `_concurrent` form for indexes.
- Don't rewrite tables (no `ALTER COLUMN type` on a billion rows). Add new column, dual-write, swap reads, drop old.
- Coordinate with the deploy: ship migration, wait, ship app code that uses it.

## CI safety

- Block PRs that change an already-applied migration file (checksum guard).
- Run `runner.status()` in CI; fail if pending migrations exist without a corresponding new file.
- Run migrations against a copy of prod data in staging before prod.
