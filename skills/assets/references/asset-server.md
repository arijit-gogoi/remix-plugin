# Asset Server — full reference

## `AssetServerOptions` — every field

```ts
interface AssetServerOptions {
  basePath: string
  fileMap: Readonly<Record<string, string>>
  rootDir?: string
  allow:    readonly string[]
  deny?:    readonly string[]
  fingerprint?: { buildId: string }
  target?: AssetTarget
  sourceMaps?: 'inline' | 'external'
  sourceMapSourcePaths?: 'url' | 'absolute'
  minify?: boolean
  watch?: boolean | AssetServerWatchOptions
  script?: {
    define?: Record<string, string>
    external?: string[]
  }
}
```

### `basePath`

Public URL prefix. Should match the path in your `router.get(...)`.

### `fileMap`

Maps URL patterns to filesystem paths. Patterns use `*name` wildcards (consistent with `route-pattern`).

```ts
fileMap: {
  '/app/*path':  'app/*path',                 // /app/foo.ts → app/foo.ts
  '/npm/*path':  'node_modules/*path',
  '/css/*path':  'app/styles/*path',          // alias
  '/legacy/*path': 'vendor/legacy/*path',
}
```

### `rootDir`

Anchor for relative paths in `fileMap`, `allow`, `deny`. Defaults to `process.cwd()`. Set to `path.resolve(import.meta.dirname, '..')` if your script lives in a `scripts/` directory.

### `allow` / `deny`

Glob patterns. `allow` is required (otherwise nothing serves). `deny` is optional and takes precedence.

```ts
allow: ['app/**', 'node_modules/**']
deny:  ['**/*.server.*', '**/*.test.*', 'app/private/**']
```

### `fingerprint`

```ts
fingerprint: { buildId: process.env.BUILD_ID! }
```

When set:
- URLs include a content hash: `/assets/app/entry.abc123.js`
- Response: `Cache-Control: public, max-age=31536000, immutable`
- Cannot be combined with `watch: true`

When omitted:
- Stable URLs
- Response: `Cache-Control: no-cache` + `ETag`
- 304 Not Modified on revalidation

`buildId` is the per-build invalidation token. Bump it (typically via the git SHA or a deploy timestamp) when fingerprinted URLs should re-issue together.

### `target`

esbuild-style compatibility target. Affects both script transpilation and CSS prefixing.

```ts
target: { browsers: ['chrome 110', 'firefox 110', 'safari 16'], es: 'es2022' }
```

### `sourceMaps`

- `'inline'`: base64 data URL appended to the compiled file
- `'external'`: separate `.map` file served at `<asset-url>.map`

External is smaller and lets debuggers cache maps separately. Inline is one round-trip for both source and map — convenient in dev.

### `sourceMapSourcePaths`

- `'url'` (default): `sources` in the source map use server paths (`/assets/app/entry.ts`)
- `'absolute'`: use the original filesystem path

`'url'` makes maps work in production (browser fetches the source URL); `'absolute'` is better for local debugging.

### `minify`

`true` strips whitespace, mangles names, removes dead code. `false` keeps source readable.

### `watch`

`true` enables filesystem watching for rebuild-on-save. `false` (default) reads once and caches.

`AssetServerWatchOptions`:
```ts
{
  ignore?: readonly string[]      // glob patterns to skip
  poll?: boolean                  // use polling (for network FS)
  pollInterval?: number           // ms, default 100
}
```

Use polling on Docker volumes, network mounts, or WSL when native fs events miss changes.

### `script.define`

esbuild-style global substitution. Replaces expressions during transform:

```ts
script: {
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.PUBLIC_KEY': JSON.stringify(process.env.PUBLIC_KEY),
  },
}
```

Strings need their own quotes (the substitution is textual).

### `script.external`

Import specifiers to leave unrewritten. The compiler skips bundling them; the browser resolves at runtime via CDN URLs or import maps.

```ts
script: {
  external: ['https://cdn.skypack.dev/react@18', 'lit'],
}
```

## `AssetServer` interface (returned by `createAssetServer`)

```ts
interface AssetServer {
  fetch(request: Request): Promise<Response>
  // ... other methods like preload generation
}
```

### `fetch(request)`

Handles a request to a path under `basePath`. Wire to your router:

```ts
router.get('/assets/*', ({ request }) => assetServer.fetch(request))
```

Returns:
- `200` with the compiled asset + correct `Content-Type`
- `304` if the request has matching `If-None-Match`
- `403` if the path violates `allow`/`deny`
- `404` if no `fileMap` entry matches
- `500` on compile error (with the error in the body in dev)

## Common patterns

### Preloading

```ts
// In a JSX Document or html template:
const preloads = await assetServer.preloads('/assets/app/entry.ts')
// → ['/assets/app/entry.abc123.js', '/assets/app/deps.def456.js', '/assets/app/style.ghi789.css']

return html`
  <head>
    ${preloads.map((url) =>
      url.endsWith('.css')
        ? html`<link rel="stylesheet" href="${url}">`
        : html`<link rel="modulepreload" href="${url}">`
    )}
  </head>
`
```

### Conditional dev/prod via env

```ts
const isDev = process.env.NODE_ENV !== 'production'

const assetServer = createAssetServer({
  basePath: '/assets',
  fileMap:  { '/app/*path': 'app/*path' },
  allow:    ['app/**'],
  watch:    isDev && { ignore: ['app/**/*.test.*'] },
  minify:   !isDev,
  sourceMaps: isDev ? 'inline' : 'external',
  fingerprint: isDev ? undefined : { buildId: process.env.BUILD_ID! },
  script: {
    define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV) },
  },
})
```

### Multiple asset servers (e.g. per locale)

You can spin up multiple `AssetServer`s with different `basePath`s and `fileMap`s and dispatch by URL. Rare — usually one server with multiple `fileMap` entries is cleaner.

## Caveats

- **Don't `watch: true` in production** — file events are wasted overhead.
- **`fingerprint` requires you to pipe a stable `buildId`** through deploys. Use git SHA, deploy timestamp, or a build counter.
- **Source maps in prod**: external is cheaper but exposes source. If your code is proprietary, set `sourceMaps: undefined` (no maps) or restrict via `deny: ['**/*.map']` at the CDN.
- **CSS-in-JS libraries** that emit `<style>` tags at runtime work as-is; libraries that compile CSS need their own pipeline.
