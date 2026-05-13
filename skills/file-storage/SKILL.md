---
name: remix-file-storage
description: Storing uploaded files in Remix v3 — the file-storage backends (filesystem, memory, S3), the key/value interface (set, get, remove), and how to integrate with the form upload pipeline. Load when the user is persisting uploads, switching storage backends, or building file-download routes.
---

# File Storage

`remix/file-storage` is a key/value interface for `File` objects. Three backends ship: filesystem, in-memory, and S3. Each one implements the same shape, so swapping is configuration, not code.

## Imports

```ts
import { createFsFileStorage }     from 'remix/file-storage/fs'
import { createMemoryFileStorage } from 'remix/file-storage/memory'
import { createS3FileStorage }     from 'remix/file-storage-s3'
```

## Backends

### Filesystem — production single-node, dev

```ts
const storage = createFsFileStorage('./uploads')
```

Files are written under the given directory; the key becomes the relative path.

### Memory — tests and dev

```ts
const storage = createMemoryFileStorage()
```

Cleared on restart. Great for the test suite — no temp dirs to clean.

### S3 — production multi-node

```ts
const storage = createS3FileStorage({
  bucket:           process.env.S3_BUCKET!,
  region:           process.env.AWS_REGION!,
  accessKeyId:      process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey:  process.env.AWS_SECRET_ACCESS_KEY!,
})
```

## Interface

```ts
storage.set(key: string, file: File | FileLike): Promise<File>
storage.get(key: string): Promise<File | null>
storage.remove(key: string): Promise<void>
storage.has(key: string): Promise<boolean>
```

`set` returns a `File` representing the stored object — often a lazy file that streams from disk/S3 only when you read its content.

## Use from an upload handler

```ts
import { createFsFileStorage } from 'remix/file-storage/fs'
import { formData } from 'remix/form-data-middleware'
import type { FileUpload } from 'remix/form-data-parser'

const storage = createFsFileStorage('./uploads')

async function uploadHandler(fileUpload: FileUpload) {
  const key = `${crypto.randomUUID()}-${fileUpload.name}`
  return await storage.set(key, fileUpload)   // becomes FormData value
}

router = createRouter({
  middleware: [formData({ uploadHandler })],
})
```

In a controller after upload:

```ts
const cover = formData.get('cover') as File | null
if (cover) {
  // cover.name, cover.size, cover.type, cover.stream() are all available
}
```

## Serve uploads back to the browser

Map a route to read from storage:

```ts
// app/controllers/uploads.ts
import { storage } from '../data/setup.ts'

export default {
  actions: {
    async show({ params }) {
      const file = await storage.get(params.key)
      if (!file) return new Response('Not found', { status: 404 })
      return new Response(file.stream(), {
        headers: {
          'Content-Type':   file.type || 'application/octet-stream',
          'Content-Length': String(file.size),
          'Cache-Control':  'public, max-age=31536000, immutable',
        },
      })
    },
  },
}
```

Hook it up in routes:

```ts
uploads: '/uploads/*key',
```

## Composition pattern — chained storage

Wrap one backend in another to add behaviour:

```ts
// quotaStorage(fileStorage) wraps `set` to reject when the bucket exceeds N MB
function quotaStorage(inner: FileStorage, quotaBytes: number): FileStorage {
  let used = 0
  return {
    async set(key, file) {
      if (used + file.size > quotaBytes) throw new Error('Quota exceeded')
      used += file.size
      return inner.set(key, file)
    },
    get:    (key) => inner.get(key),
    remove: async (key) => { /* update `used` */; await inner.remove(key) },
    has:    (key) => inner.has(key),
  }
}
```

## Lifecycle

- Cleanup on user/object deletion: walk references and call `storage.remove(key)`.
- Background sweep for orphaned files: persist `(key, created_at)` in the DB; periodically reconcile.

## Further reading

- `references/fs-backend.md` — filesystem layout, atomic rename, fs.permissions
- `references/s3-backend.md` — pre-signed URLs, lifecycle rules, multi-region
- `references/memory-backend.md` — when memory storage is the right call
- See also: [forms-uploads](../forms-uploads/SKILL.md)
