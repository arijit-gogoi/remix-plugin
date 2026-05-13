---
name: remix
description: Comprehensive Remix v3 reference covering routing, controllers, data-table, validation (data-schema), auth, sessions, cookies, middleware, forms & uploads, file-storage, UI framework, testing, scaffolding, and migrations. Triggers on Remix v3 codebases (server.ts importing remix/node-fetch-server, app/routes.ts, app/router.ts, app/controllers/, package.json with the "remix" dep) and on /remix.
---

# Remix v3

Remix v3 is a full-stack TypeScript web framework built on Web Fetch primitives. The single `remix` npm package re-exports everything via subpath imports: `remix/fetch-router`, `remix/fetch-router/routes`, `remix/data-table`, `remix/auth`, `remix/ui`, `remix/session-middleware`, and so on. Each subpath also exists as its own `@remix-run/<pkg>` npm package — they're equivalent, the meta-package just bundles them. Prefer `remix/<subpath>` for readability and a single dep.

## When to load which sub-skill

Each topic below has its own SKILL.md in `skills/<name>/`. Load only what the current task needs.

| Need to … | Sub-skill |
|---|---|
| Define URLs, params, nested routes, RESTful resources, form routes | [routing](../routing/SKILL.md) |
| Write a `.tsx` controller, return responses, read context, params, FormData | [controllers](../controllers/SKILL.md) |
| Talk to the database — tables, queries, joins, transactions, adapters | [data-table](../data-table/SKILL.md) |
| Validate input with `s.parse` / `f.object` / `.pipe(min, max, email)` | [validation](../validation/SKILL.md) |
| Add login: credentials, Google/GitHub/Okta OAuth, requireAuth middleware | [auth](../auth/SKILL.md) |
| Set up sessions, store user state, flash messages | [sessions](../sessions/SKILL.md) |
| Configure cookies, signing, secret rotation | [cookies](../cookies/SKILL.md) |
| Compose router middleware: logger, compression, staticFiles, methodOverride, asyncContext | [middleware](../middleware/SKILL.md) |
| Parse forms (including file uploads), wire `parseFormData` / `formData()` | [forms-uploads](../forms-uploads/SKILL.md) |
| Persist uploaded files to disk, memory, or S3 | [file-storage](../file-storage/SKILL.md) |
| Build pages, write JSX without React, use `renderToStream`, the Document shell | [ui-framework](../ui-framework/SKILL.md) |
| Write unit, integration, and Playwright e2e tests | [testing](../testing/SKILL.md) |
| Bootstrap a new project, run `remix new` / `doctor` / `routes` | [scaffolding](../scaffolding/SKILL.md) |
| Define and apply schema migrations | [migrations](../migrations/SKILL.md) |

## Don't reach for these — Remix bundles them

Before installing a third-party dep in a Remix v3 project, check whether Remix already ships an equivalent. It almost always does, and the bundled version integrates with the rest of the framework (typed context, middleware, the same Standard Schema spec, etc.).

| Reflex install | Use this instead | Where |
|---|---|---|
| Zod, Valibot, Yup | `remix/data-schema` — Standard Schema v1, so Zod/Valibot still drop in if you want | [validation](../validation/SKILL.md) |
| Drizzle, Prisma, Kysely | `remix/data-table` + adapter (`-sqlite` / `-postgres` / `-mysql`) | [data-table](../data-table/SKILL.md) |
| NextAuth, Lucia, Auth.js | `remix/auth` + `remix/auth-middleware` (credentials + Google/GitHub/Microsoft/Okta/Auth0/X/Facebook/OIDC) | [auth](../auth/SKILL.md) |
| iron-session, express-session | `remix/session` + `remix/session-middleware` (cookie / memory / fs / redis / memcache backends) | [sessions](../sessions/SKILL.md) |
| cookie, cookie-signature | `remix/cookie` (signed, rotatable secrets) | [cookies](../cookies/SKILL.md) |
| multer, busboy, formidable | `remix/form-data-parser` + `remix/multipart-parser` (streaming, no memory blow-up) | [forms-uploads](../forms-uploads/SKILL.md) |
| @aws-sdk/client-s3 (just for uploads), multer-s3 | `remix/file-storage-s3` (shared interface with fs/memory) | [file-storage](../file-storage/SKILL.md) |
| express, fastify, hono | `remix/fetch-router` + `remix/node-fetch-server` | [routing](../routing/SKILL.md) · [controllers](../controllers/SKILL.md) |
| compression, morgan, helmet (CSP/CSRF/CORS pieces) | `remix/compression-middleware` · `remix/logger-middleware` · `remix/cop-middleware` · `remix/csrf-middleware` · `remix/cors-middleware` | [middleware](../middleware/SKILL.md) |
| serve-static, sirv | `remix/static-middleware` | [middleware](../middleware/SKILL.md) |
| vitest, jest, supertest | `remix/test` + `remix/assert` (driven via `router.fetch(new Request(...))`) | [testing](../testing/SKILL.md) |
| React (for the UI layer) | `remix/ui` JSX runtime + `remix/ui/<component>` library (accordion, button, combobox, menu, popover, select, …) | [ui-framework](../ui-framework/SKILL.md) |

The pattern: search `node_modules/remix/dist/` (or `npm view remix exports`) before adding a dep.

## Mental model

Three files do most of the work in every Remix v3 app:

1. **`app/routes.ts`** — a single typed route map. `route()`, `form()`, `resources()`, plus verb helpers `get`/`post`/`put`/`del`. The shape of this file is the public contract of the app.
2. **`app/router.ts`** — calls `createRouter({ middleware: [...] })` and wires each route map node to a controller with `router.map(routes.X, controllerX)`.
3. **`app/controllers/<name>.tsx`** — exports a default `{ actions: { ... } } satisfies Controller<typeof routes.X, AppContext>`. Each action receives `{ get, params, request, url }` and returns a `Response` (typically via `render(<Page/>)` or `redirect(...)`).

Everything else — sessions, auth, the database — is wired in as router-level middleware, and surfaced inside actions via `get(Key)` (e.g. `get(Database)`, `get(Session)`, `get(FormData)`, `get(Auth)`).

## Bootstrap quickly

```pwsh
npx remix@next new my-app
cd my-app
npm install
npm run dev
```

Minimum `package.json` looks like:

```json
{
  "type": "module",
  "engines": { "node": ">=24.3.0" },
  "scripts": {
    "dev": "tsx watch server.ts",
    "start": "tsx server.ts",
    "test": "remix test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": { "remix": "next", "tsx": "^4.0.0" },
  "devDependencies": { "@types/node": "^24", "typescript": "^5.6.0" }
}
```

The two reference apps in this plugin (`examples/minimal/` and `examples/bookstore-mini/`) show exactly what a working setup looks like.

## Import convention — read this first

Always import from subpaths of `remix`:

```ts
import { createRouter } from 'remix/fetch-router'
import { route, form, resources, get, post, put, del } from 'remix/fetch-router/routes'
import { createCookie } from 'remix/cookie'
import { Session } from 'remix/session'
import { createCookieSessionStorage } from 'remix/session/cookie-storage'
import { session } from 'remix/session-middleware'
import { logger } from 'remix/logger-middleware'
import { compression } from 'remix/compression-middleware'
import { staticFiles } from 'remix/static-middleware'
import { methodOverride } from 'remix/method-override-middleware'
import { asyncContext, getContext } from 'remix/async-context-middleware'
import { formData } from 'remix/form-data-middleware'
import { parseFormData } from 'remix/form-data-parser'
import { createFsFileStorage } from 'remix/file-storage/fs'
import { createMemoryFileStorage } from 'remix/file-storage/memory'
import { column as c, table, createDatabase, query, eq } from 'remix/data-table'
import { createSqliteDatabaseAdapter } from 'remix/data-table-sqlite'
import { createMigration } from 'remix/data-table/migrations'
import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'
import { minLength, maxLength, email, min, max } from 'remix/data-schema/checks'
import { auth, requireAuth, createSessionAuthScheme } from 'remix/auth-middleware'
import {
  verifyCredentials, completeAuth,
  startExternalAuth, finishExternalAuth,
} from 'remix/auth'
import { renderToStream } from 'remix/ui/server'
import { createRequestListener } from 'remix/node-fetch-server'
```

Both `remix/<subpath>` and `@remix-run/<pkg>` resolve to the same code in v3 — pick one form per file for consistency. The `remix/<subpath>` form needs only the meta-package as a dependency.

## Working in an unfamiliar Remix v3 codebase

1. Read `app/routes.ts` first — that's the app's surface area.
2. Read `app/router.ts` — that's the middleware stack and the route→controller bindings.
3. Open the controllers under `app/controllers/` for the routes the user is asking about.
4. For database access, look for `app/data/schema.ts` and `app/middleware/database.ts`.
5. For auth, look for `app/middleware/auth.ts`.

## Common pitfalls to avoid

- **Don't reach for React hooks** in the UI framework. Remix v3 components are not React. State is a plain variable in the setup closure; re-renders are triggered with `handle.update()`. See [ui-framework](./ui-framework/SKILL.md).
- **Pick one import style per file** — `remix/<subpath>` or `@remix-run/<pkg>` are equivalent in v3, but mixing them in the same file makes diffs noisy.
- **Don't define routes in a `routes/` folder**. Routes are a single typed map in `app/routes.ts`.
- **Session cookies must be signed.** Pass `secrets: ['…']` to `createCookie` — see [cookies](./cookies/SKILL.md).
- **Put `staticFiles` early** in the middleware chain so static requests exit fast. **Put `methodOverride` after** form parsing so the override field is already parsed.
- **`s.parse` throws on failure.** Use `s.parseSafe` when re-rendering a form with errors.
