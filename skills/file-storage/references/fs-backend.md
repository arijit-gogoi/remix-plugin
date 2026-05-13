# Filesystem File Storage

```ts
import { createFsFileStorage } from 'remix/file-storage/fs'

const storage = createFsFileStorage('./uploads', {
  // optional flags below
})
```

## Layout on disk

```
uploads/
├── 9a1b…-cover.png        ← keys land here
├── 3f4e…-resume.pdf
└── …
```

The key is the relative path. Forward slashes in the key create subdirectories. The backend creates parent dirs as needed.

## Atomic writes

`storage.set(key, file)` writes to a temp file and renames into place. So consumers of `storage.get(key)` see a complete file or no file at all — never a half-written one.

## Concurrency

Multiple `set(key, …)` calls for the *same* key are last-write-wins (atomic rename). Multiple readers can call `get(key)` safely while a write is in flight — they see the previous version or the new one, never a corrupted intermediate.

## Permissions

The backend uses the running process's umask. Files end up readable by the user that ran the server. If you serve uploads through a separate static-file server (nginx, Caddy), make sure that server's user has read access — or serve them through Remix itself via a route.

## Cleanup

Filesystem storage doesn't expire entries automatically. Build a sweeper that walks the DB and deletes orphaned files:

```ts
async function sweepOrphans() {
  for await (const file of fs.readdir('./uploads')) {
    const referenced = await db.findOne(uploadRefs, { where: { key: file } })
    if (!referenced) await fs.unlink(`./uploads/${file}`)
  }
}
```

Run on a cron once a day in prod.

## Capacity & quotas

The fs backend has no built-in quota. Either:
- Enforce at the upload handler (deny large files).
- Mount the directory on its own filesystem with disk quotas.
- Run periodic `du`-style checks and alert when over threshold.

## Backups

Treat the directory like database content: include it in your nightly backups. A common pattern is to mirror to S3 nightly with `aws s3 sync ./uploads s3://bucket/uploads/`.

## When to *not* use fs storage

- Multi-node deploys (the dir isn't shared).
- Stateless serverless functions (the FS resets).
- Anything where you want cross-region access.

In those cases use `createS3FileStorage` instead.
