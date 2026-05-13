# QueryBuilder — full reference

`db.query(table)` returns a `QueryBuilder`. Chain methods to build a query, then `.exec()` (or call `.select(...).update(...)/.delete()`) to run it.

## SELECT

```ts
import { eq, neq, gt, gte, lt, lte, like, ilike, isNull, isNotNull, inList, between, and, or, not, query } from 'remix/data-table'

const q = query(books)
  .where({ in_stock: true })                       // shorthand: equals
  .where(gte(books.price, 10))                     // operator helpers
  .where(or(
    ilike(books.title, '%remix%'),
    ilike(books.author, '%remix%'),
  ))
  .orderBy(books.price, 'asc')
  .limit(20)
  .offset(0)
  .select({
    id:    books.id,
    title: books.title,
    price: books.price,
  })

const rows = await db.exec(q)
```

### Joins

```ts
const q = query(orders)
  .join(users, eq(orders.user_id, users.id))
  .leftJoin(orderItems, eq(orderItems.order_id, orders.id))
  .where({ status: 'pending' })
  .select({
    orderId:   orders.id,
    email:     users.email,
    itemCount: countDistinct(orderItems.book_id),
  })
  .groupBy(orders.id, users.email)
```

### Aggregations

```ts
import { count, countDistinct, sum, avg, min as mn, max as mx } from 'remix/data-table'

const stats = await db.exec(
  query(orders)
    .where({ status: 'delivered' })
    .select({
      total:    count(),
      revenue:  sum(orders.total),
      avgValue: avg(orders.total),
    }),
)
```

## INSERT

```ts
await db.query(users).insert({ id: 1, email: 'a@example.com', role: 'customer' })

// Returning row(s):
const inserted = await db.query(users).insert({ … }, { returnRow: true })

// Bulk insert:
await db.query(users).insert([
  { … }, { … }, { … },
])
```

## UPDATE (scoped)

```ts
await db.query(orders)
  .where({ status: 'pending' })
  .orderBy('created_at', 'asc')
  .limit(100)
  .update({ status: 'processing' })
```

## DELETE (scoped)

```ts
await db.query(orders)
  .where({ status: 'delivered' })
  .orderBy('created_at', 'asc')
  .limit(200)
  .delete()
```

## Operator helpers

| Helper                  | Equivalent                  |
|-------------------------|-----------------------------|
| `eq(col, v)`            | `col = v`                   |
| `neq(col, v)`           | `col <> v`                  |
| `gt`, `gte`, `lt`, `lte`| ranges                     |
| `like(col, pat)`        | `LIKE`                      |
| `ilike(col, pat)`       | case-insensitive `LIKE`     |
| `isNull(col)`           | `IS NULL`                   |
| `isNotNull(col)`        | `IS NOT NULL`               |
| `inList(col, [a,b,c])`  | `IN (…)`                    |
| `between(col, a, b)`    | `BETWEEN a AND b`           |
| `and(…)`, `or(…)`, `not(…)` | boolean composition    |

## Where shorthand

`.where({ status: 'pending' })` ≡ `.where(eq(table.status, 'pending'))`.
`.where({ status: 'pending', user_id: 42 })` ≡ AND of equalities.
Mix shorthand with operator helpers freely.
