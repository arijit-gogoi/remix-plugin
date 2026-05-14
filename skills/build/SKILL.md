---
name: remix-build
description: The build / asset pipeline in Remix v3 — primarily `remix/assets` (`createAssetServer({ basePath, fileMap, allow, deny, fingerprint, watch, sourceMaps, target, minify, script })`) which compiles browser JS/TS/CSS on demand and serves it through the router. No separate `vite build` step, no `dist/` directory. Plus the surrounding production-build concerns: source-map strategy (`'inline'` vs `'external'`), fingerprinted URLs for long-cache busting, env-var injection via `script.define`, dev watch mode, allow/deny access control, integration with `staticFiles` for pre-shipped assets. Load whenever the user is configuring the asset pipeline, branching dev vs prod, setting up fingerprinted URLs, serving compiled JS/CSS, migrating away from a separate bundler, or about to install Vite, esbuild, webpack, Rollup, Parcel, Turbopack, Bun's bundler, swc directly, or a CSS framework's build step. Also load on questions like "how do I ship a Remix app to production?" or "where does `app/entry.client.tsx` get compiled?".
---

# Build

The Remix v3 build pipeline. Today, this is dominated by `remix/assets` — on-demand TS/JS and CSS compilation served straight from the router. There's no separate bundler step, no `dist/` directory, no `vite build`.

Replaces Vite, esbuild, webpack, parcel for most setups.

## Imports

```ts
import { createAssetServer, type AssetServer, type AssetServerOptions } from 'remix/assets'
```

## Minimum setup

```ts
import { createRouter } from 'remix/fetch-router'
import { createAssetServer } from 'remix/assets'

const assetServer = createAssetServer({
  basePath: '/assets',
  fileMap: {
    '/app/*path':  'app/*path',
    '/npm/*path':  'node_modules/*path',
  },
  allow: ['app/**', 'node_modules/**'],
})

const router = createRouter()
router.get('/assets/*', ({ request }) => assetServer.fetch(request))
```

That's it. A request for `/assets/app/entry.ts` reads `app/entry.ts`, transpiles it, and serves it with appropriate caching.

## `AssetServerOptions` — the important ones

| Option | Notes |
|---|---|
| `basePath` | Public URL prefix — `'/assets'` |
| `fileMap` | URL pattern → file path. Use `*path` wildcards. Keyed by URL pattern. |
| `rootDir` | Where to resolve relative paths from. Defaults to `process.cwd()`. |
| `allow` | Glob patterns of files that may be served (required) |
| `deny` | Glob patterns to block (takes precedence over `allow`) |
| `fingerprint` | `{ buildId: '...' }` → source-based fingerprinted URLs for cache-busting |
| `sourceMaps` | `'inline'` (data URL) or `'external'` (separate `.map` file) |
| `target` | Browser/ES compatibility target — see `AssetTarget` |
| `minify` | Compile output minified (true in prod, false in dev) |
| `watch` | Dev mode — rebuild on file change. Cannot combine with `fingerprint`. |
| `script.define` | esbuild-style `define` for replacing globals like `process.env.NODE_ENV` |
| `script.external` | Import specifiers to leave unrewritten (CDNs, import maps) |

## Access control — `allow` is mandatory

```ts
createAssetServer({
  basePath: '/assets',
  fileMap: { '/app/*path': 'app/*path' },
  allow:   ['app/assets/**'],            // only files under app/assets/
  deny:    ['app/**/*.server.*'],        // never serve *.server.ts/css/etc.
})
```

Without `allow`, the server refuses everything. `deny` overrides `allow` — use it for files that look serveable but shouldn't be.

The pattern `**/*.server.*` is the convention: any file with `.server.` in its name stays on the server, never reaches the browser. Mirrors Next.js's `.server.ts` naming.

## Dev vs prod

Dev:

```ts
createAssetServer({
  basePath: '/assets',
  fileMap:  { '/app/*path': 'app/*path' },
  allow:    ['app/**'],
  watch:    true,
  minify:   false,
  sourceMaps: 'inline',
})
```

Prod:

```ts
createAssetServer({
  basePath: '/assets',
  fileMap:  { '/app/*path': 'app/*path', '/npm/*path': 'node_modules/*path' },
  allow:    ['app/**', 'node_modules/**'],
  minify:   true,
  sourceMaps: 'external',
  fingerprint: { buildId: process.env.BUILD_ID! },     // bust browser cache per deploy
})
```

Branch on `process.env.NODE_ENV`:

```ts
const isDev = process.env.NODE_ENV !== 'production'

const assetServer = createAssetServer({
  basePath: '/assets',
  fileMap:  { '/app/*path': 'app/*path' },
  allow:    ['app/**'],
  watch:    isDev,
  minify:   !isDev,
  sourceMaps: isDev ? 'inline' : 'external',
  fingerprint: isDev ? undefined : { buildId: process.env.BUILD_ID ?? 'dev' },
})
```

## Caching behavior

Without `fingerprint`: assets get `Cache-Control: no-cache` plus an `ETag`. Browsers conditional-GET on every reload — cheap (304) but a round-trip.

With `fingerprint`: URLs include a content hash (e.g. `/assets/app/entry.abc123.js`). `Cache-Control: public, max-age=31536000, immutable`. One round-trip per deploy.

## Integration with `staticFiles`

`staticFiles` serves pre-built files from a directory; `assets` serves compiled-on-demand from source. They're complementary:

```ts
createRouter({
  middleware: [
    staticFiles('./public', { cacheControl: 'public, max-age=31536000, immutable' }),
  ],
})

// Then wire createAssetServer for compiled assets:
router.get('/assets/*', ({ request }) => assetServer.fetch(request))
```

`public/` for pre-shipped files (images, favicons, fonts). `assets` for code.

## Generating preload tags

`AssetServer` can emit preload URLs for an entry and its dependencies — feed into `<link rel="modulepreload">` tags in the document head. See the `references/asset-server.md` deep doc for the full API.

## Migration from Vite/esbuild

Most Vite plugins won't transfer. The migration story:

1. Replace your bundler config with `createAssetServer({...})`.
2. Move HTML entries from Vite's `index.html` into your `Document` JSX shell.
3. Add CSS imports via `import './styles.css'` in your entry — `assets` understands them.
4. Remove Vite's dev server; `remix dev` already watches and reloads.

## Further reading

- [`references/asset-server.md`](./references/asset-server.md) — full `AssetServerOptions`, preload generation, source-map strategies
- See also: [middlewares](../middlewares/SKILL.md) for `staticFiles`, [ui](../ui/SKILL.md) for client hydration, [cli](../cli/SKILL.md) for project bootstrap
