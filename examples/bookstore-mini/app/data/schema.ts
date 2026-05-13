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
