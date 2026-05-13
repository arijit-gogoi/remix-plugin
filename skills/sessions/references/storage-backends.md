# Session Storage Backends

All backends implement the same `SessionStorage` interface; pick based on operational constraints.

## Cookie storage (default)

```ts
import { createCookieSessionStorage } from 'remix/session/cookie-storage'

const sessionStorage = createCookieSessionStorage()
```

- State lives **inside** the cookie (signed + serialised).
- Zero server-side state — works on serverless edges trivially.
- 4 KB browser cookie cap; keep payloads small (just `userId`, a few flags).
- Updating a session means re-sending the cookie. That's automatic.

## Memory storage

```ts
import { createMemorySessionStorage } from 'remix/session/memory-storage'

const sessionStorage = createMemorySessionStorage()
```

- State in an in-process `Map<sessionId, …>`.
- Cookie carries only the session id.
- **Use only in tests and local dev** — values are lost on restart and don't cross workers.

## Filesystem storage

```ts
import { createFsSessionStorage } from 'remix/session/fs-storage'

const sessionStorage = createFsSessionStorage({
  dir: './sessions',
})
```

- One file per session on disk.
- OK for single-node prod when memory is tight.
- File I/O on every mutation. Use `node:fs.promises` async APIs internally.

## Redis storage

```ts
import { createRedisSessionStorage } from 'remix/session/redis-storage'

const sessionStorage = createRedisSessionStorage({
  url: process.env.REDIS_URL!,
  prefix: 'sess:',
  ttl: 60 * 60 * 24 * 30,
})
```

- Right answer for multi-node prod.
- Set a TTL matching your session cookie's `maxAge`.
- Use a dedicated Redis (or cluster) for sessions if you also use Redis as a cache — eviction policies differ.

## Memcache storage

```ts
import { createMemcacheSessionStorage } from 'remix/session/memcache-storage'

const sessionStorage = createMemcacheSessionStorage({
  servers: ['memcache:11211'],
})
```

Same shape; useful if your stack already runs Memcache.

## Custom backends

The interface is small. Implement these four methods and any storage will work:

```ts
type SessionStorage = {
  read(id: string):    Promise<SessionData | null>
  create(data: SessionData): Promise<{ id: string }>
  update(id: string, data: SessionData): Promise<void>
  destroy(id: string): Promise<void>
}
```

E.g. a Postgres-backed session store:

```ts
const pgSessionStorage: SessionStorage = {
  async read(id) {
    const row = await db.findOne(sessions, { where: { id } })
    return row?.data ?? null
  },
  async create(data) {
    const id = crypto.randomUUID()
    await db.create(sessions, { id, data, updated_at: Date.now() })
    return { id }
  },
  async update(id, data) {
    await db.update(sessions, id, { data, updated_at: Date.now() })
  },
  async destroy(id) {
    await db.delete(sessions, id)
  },
}
```

## Choosing

| Use case                       | Pick                |
|-------------------------------|---------------------|
| Single edge function           | cookie              |
| Local dev / unit tests          | memory              |
| Single VM, tight memory budget | fs                  |
| Multi-node prod, low latency   | redis (most common) |
| Already running memcache       | memcache            |
| Want SQL queryability of sessions | custom postgres   |
