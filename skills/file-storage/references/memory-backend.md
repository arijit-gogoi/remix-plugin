# Memory File Storage

```ts
import { createMemoryFileStorage } from 'remix/file-storage/memory'

const storage = createMemoryFileStorage()
```

In-process `Map<string, File>`. Lives only as long as the process does.

## When it's the right call

- **Unit & integration tests.** No temp dirs to clean. Reset between tests by recreating the storage.
- **Local dev iteration.** Fast restarts, no leftover state from previous runs.
- **Ephemeral previews.** PR-preview deployments where uploads are short-lived and the deploy is throwaway.

## When it's wrong

- Production. Restart loses everything.
- Anything multi-node — workers don't share their maps.
- Large files. RAM is finite.

## Patterns

### Reset between tests

```ts
import { describe, it, beforeEach } from 'remix/test'
import { createMemoryFileStorage } from 'remix/file-storage/memory'

let storage: ReturnType<typeof createMemoryFileStorage>

describe('upload flow', () => {
  beforeEach(() => { storage = createMemoryFileStorage() })

  it('stores the cover', async () => {
    // … hit your endpoint, then assert
    const file = await storage.get('cover.png')
    assert.ok(file)
  })
})
```

### Mocking S3 in tests

A memory storage is a drop-in replacement for an S3 one when you don't want network calls. Inject it via a factory:

```ts
function createApp(opts: { storage: FileStorage }) {
  // build router using opts.storage
}

// In tests:
createApp({ storage: createMemoryFileStorage() })
```

The interface is the same — your application code doesn't know the difference.

## Interface (recap)

```ts
storage.set(key, file)     // Promise<File>
storage.get(key)           // Promise<File | null>
storage.has(key)           // Promise<boolean>
storage.remove(key)        // Promise<void>
```

## Behaviour notes

- `set` is synchronous in spirit (returns immediately) but the API is async for parity.
- `get` returns a new File backed by an in-memory buffer; reading the stream is cheap.
- Memory pressure: if you store more bytes than you have RAM for, Node OOMs. Add limits at the upload handler.
