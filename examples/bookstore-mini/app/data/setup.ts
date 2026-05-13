import * as fs from 'node:fs'
import * as path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { createDatabase } from 'remix/data-table'
import { createSqliteDatabaseAdapter } from 'remix/data-table-sqlite'

import { books, users, orders } from './schema.ts'

const DB_PATH = './db/bookstore.sqlite'

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const sqlite = new DatabaseSync(DB_PATH)
sqlite.exec('PRAGMA foreign_keys = ON')

export const db = createDatabase(createSqliteDatabaseAdapter(sqlite))

export async function initializeBookstoreDatabase() {
  await ensureSchema()
  await seedIfEmpty()
}

async function ensureSchema() {
  // For a tiny demo we apply DDL inline. A real app uses migrations —
  // see skills/migrations/SKILL.md.
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      slug            TEXT NOT NULL UNIQUE,
      title           TEXT NOT NULL,
      author          TEXT NOT NULL,
      description     TEXT NOT NULL,
      price           NUMERIC(10,2) NOT NULL,
      genre           TEXT NOT NULL,
      cover_url       TEXT NOT NULL,
      isbn            TEXT NOT NULL,
      published_year  INTEGER NOT NULL,
      in_stock        INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      email           TEXT NOT NULL UNIQUE,
      password_hash   TEXT NOT NULL,
      name            TEXT NOT NULL,
      role            TEXT NOT NULL,
      created_at      INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      total           NUMERIC(10,2) NOT NULL,
      status          TEXT NOT NULL,
      created_at      INTEGER NOT NULL
    );
  `)
}

async function seedIfEmpty() {
  const existing = await db.findMany(books, { limit: 1 })
  if (existing.length > 0) return

  const seed = [
    { slug: 'the-pragmatic-programmer', title: 'The Pragmatic Programmer',
      author: 'Hunt & Thomas', description: 'A handbook for software craftsmanship.',
      price: 29.95, genre: 'Programming', cover_url: '/images/pragmatic.jpg',
      isbn: '9780201616224', published_year: 1999, in_stock: true },
    { slug: 'code-complete', title: 'Code Complete',
      author: 'Steve McConnell', description: 'Practical software construction.',
      price: 34.50, genre: 'Programming', cover_url: '/images/code-complete.jpg',
      isbn: '9780735619678', published_year: 2004, in_stock: true },
    { slug: 'designing-data-intensive-applications',
      title: 'Designing Data-Intensive Applications',
      author: 'Martin Kleppmann', description: 'The big ideas behind reliable, scalable systems.',
      price: 49.99, genre: 'Systems', cover_url: '/images/ddia.jpg',
      isbn: '9781449373320', published_year: 2017, in_stock: true },
  ]

  for (const row of seed) await db.create(books, row)
}
