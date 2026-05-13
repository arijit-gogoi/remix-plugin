#!/usr/bin/env bun
// Drops a new migration file under db/migrations/ with the current timestamp.
//
// Usage:
//   bun run scripts/create-migration.ts --name add_reviews_table

import * as path from 'node:path'
import { parseArgs, require_, writeFileSafe, timestamp } from './_shared.ts'

const args = parseArgs(process.argv.slice(2))
const name = require_(args, 'name').replace(/\s+/g, '_').toLowerCase()
const ts   = timestamp()
const file = path.resolve(`db/migrations/${ts}_${name}.ts`)

writeFileSafe(file, `import { column as c, createMigration } from 'remix/data-table/migrations'
import { table } from 'remix/data-table'

export default createMigration({
  async up({ schema }) {
    // example:
    //
    // const reviews = table({
    //   name: 'reviews',
    //   columns: {
    //     id:         c.integer().primaryKey().autoIncrement(),
    //     book_id:    c.integer().notNull().references('books', 'id', 'reviews_book_id_fk').onDelete('cascade'),
    //     body:       c.text().notNull(),
    //     created_at: c.integer().notNull(),
    //   },
    // })
    // await schema.createTable(reviews)
  },

  async down({ schema }) {
    // await schema.dropTable('reviews', { ifExists: true })
  },
})
`)
