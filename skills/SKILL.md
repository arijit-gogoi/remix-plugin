---
name: remix
description: Comprehensive Remix v3 reference covering routing, controllers, data-table, data-schema, auth, sessions, cookies, middleware, forms & uploads, file-storage, UI framework, testing, scaffolding, and migrations. Triggers on Remix v3 codebases (server.ts importing remix/node-fetch-server, app/routes.ts, app/router.ts, app/controllers/, package.json with the "remix" dep) and on /remix.
---

# Remix v3

Remix v3 is a full-stack TypeScript web framework built on Web Fetch primitives. The single `remix` npm package re-exports everything via subpath imports: `remix/fetch-router`, `remix/routes`, `remix/data-table`, `remix/auth`, `remix/ui`, `remix/session-middleware`, and so on. There is no separate `@remix-run/*` per-package install — always import from `remix/<subpath>`.

## When to load which sub-skill

Each topic below has its own SKILL.md in `skills/<name>/`. Load only what the current task needs.

| Need to … | Sub-skill |
|---|---|
| Define URLs, params, nested routes, RESTful resources, form routes | [routing](./routing/SKILL.md) |
| Write a `.tsx` controller, return responses, read context, params, FormData | [controllers](./controllers/SKILL.md) |
| Talk to the database — tables, queries, joins, transactions, adapters | [data-table](./data-table/SKILL.md) |
| Validate input with `s.parse` / `f.object` / `.pipe(min, max, email)` | [data-schema](./data-schema/SKILL.md) |
| Add login: credentials, Google/GitHub/Okta OAuth, requireAuth middleware | [auth](./auth/SKILL.md) |
| Set up sessions, store user state, flash messages | [sessions](./sessions/SKILL.md) |
| Configure cookies, signing, secret rotation | [cookies](./cookies/SKILL.md) |
| Compose router middleware: logger, compression, staticFiles, methodOverride, asyncContext | [middleware](./middleware/SKILL.md) |
| Parse forms (including file uploads), wire `parseFormData` / `formData()` | [forms-uploads](./forms-uploads/SKILL.md) |
| Persist uploaded files to disk, memory, or S3 | [file-storage](./file-storage/SKILL.md) |
| Build pages, write JSX without React, use `renderToStream`, the Document shell | [ui-framework](./ui-framework/SKILL.md) |
| Write unit, integration, and Playwright e2e tests | [testing](./testing/SKILL.md) |
| Bootstrap a new project, run `remix new` / `doctor` / `routes` | [scaffolding](./scaffolding/SKILL.md) |
| Define and apply schema migrations | [migrations](./migrations/SKILL.md) |

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
  "dependencies": { "remix": "^0.2.0", "tsx": "^4.0.0" },
  "devDependencies": { "@types/node": "^24", "typescript": "^5.6.0" }
}
```

The two reference apps in this plugin (`examples/minimal/` and `examples/bookstore-mini/`) show exactly what a working setup looks like.

## Import convention — read this first

Always import from subpaths of `remix`:

```ts
import { createRouter } from 'remix/fetch-router'
import { route, form, resources, get, post, put, del } from 'remix/routes'
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

Don't mix `@remix-run/<pkg>` imports into Remix v3 code — those are v2 packages.

## Working in an unfamiliar Remix v3 codebase

1. Read `app/routes.ts` first — that's the app's surface area.
2. Read `app/router.ts` — that's the middleware stack and the route→controller bindings.
3. Open the controllers under `app/controllers/` for the routes the user is asking about.
4. For database access, look for `app/data/schema.ts` and `app/middleware/database.ts`.
5. For auth, look for `app/middleware/auth.ts`.

## Common pitfalls to avoid

- **Don't reach for React hooks** in the UI framework. Remix v3 components are not React. State is a plain variable in the setup closure; re-renders are triggered with `handle.update()`. See [ui-framework](./ui-framework/SKILL.md).
- **Don't import from `@remix-run/*`** — those packages target Remix v2.
- **Don't define routes in a `routes/` folder**. Routes are a single typed map in `app/routes.ts`.
- **Session cookies must be signed.** Pass `secrets: ['…']` to `createCookie` — see [cookies](./cookies/SKILL.md).
- **Put `staticFiles` early** in the middleware chain so static requests exit fast. **Put `methodOverride` after** form parsing so the override field is already parsed.
- **`s.parse` throws on failure.** Use `s.parseSafe` when re-rendering a form with errors.
