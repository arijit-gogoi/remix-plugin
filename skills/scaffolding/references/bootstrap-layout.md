# Bootstrap Layout — annotated walk-through

What `npx remix new <name>` produces, and what every file does.

## Directory tree

```
my-app/
├── app/
│   ├── controllers/
│   │   ├── auth.tsx          ← simple auth landing controller
│   │   └── home.tsx          ← root page
│   ├── ui/
│   │   └── document.tsx      ← <html>/<head>/<body> shell
│   ├── router.ts             ← middleware + router.map() wiring
│   └── routes.ts             ← the typed route map
├── public/                   ← served by staticFiles middleware
├── package.json
├── server.ts                 ← http.createServer + router.fetch
└── tsconfig.json             ← jsx: react-jsx, jsxImportSource: remix/ui
```

## `package.json`

```json
{
  "name": "my-app",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24.3.0" },
  "scripts": {
    "dev":       "tsx watch server.ts",
    "start":     "tsx server.ts",
    "test":      "remix test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "remix": "^0.2.0",
    "tsx":   "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^24",
    "typescript":  "^5.6.0"
  }
}
```

- `type: module` — every `.ts/.tsx` runs as ESM.
- `tsx watch` reloads on file changes; in prod just run `tsx server.ts`.
- `remix test` runs the framework's test runner.

## `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "target":      "ES2022",
    "module":      "NodeNext",
    "moduleResolution": "NodeNext",
    "strict":      true,
    "esModuleInterop": true,
    "skipLibCheck":    true,
    "jsx":             "react-jsx",
    "jsxImportSource": "remix/ui",
    "types":           ["node"]
  },
  "include": ["app", "server.ts"]
}
```

The `jsxImportSource` line is what makes JSX compile to `remix/ui/jsx-runtime` — don't change it.

## `server.ts`

```ts
import * as http from 'node:http'
import { createRequestListener } from 'remix/node-fetch-server'
import { router } from './app/router.ts'

const port = Number(process.env.PORT ?? 3000)

const server = http.createServer(
  createRequestListener(async (request) => {
    try {
      return await router.fetch(request)
    } catch (error) {
      console.error(error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }),
)

server.listen(port, () => {
  console.log(`listening on http://localhost:${port}`)
})
```

`createRequestListener` bridges Node's `http.IncomingMessage`/`ServerResponse` to Web Fetch `Request`/`Response`.

## `app/router.ts`

```ts
import { createRouter } from 'remix/fetch-router'
import { staticFiles } from 'remix/static-middleware'

import { routes } from './routes.ts'
import { home } from './controllers/home.tsx'
import { auth } from './controllers/auth.tsx'

export const router = createRouter({
  middleware: [
    staticFiles('./public', { cacheControl: 'public, max-age=3600' }),
  ],
})

router.map(routes.home, home)
router.map(routes.auth, auth)
```

The middleware stack starts minimal. Add `logger`, `compression`, `session`, etc. as you build out.

## `app/routes.ts`

```ts
import { route } from 'remix/routes'

export const routes = route({
  home: '/',
  auth: route('/auth', { index: '/' }),
})
```

## `app/controllers/home.tsx`

```tsx
import type { Controller } from 'remix/fetch-router'
import type { AppContext } from '../router.ts'
import { routes } from '../routes.ts'
import { render } from '../utils/render.tsx'

import { HomePage } from '../views/home-page.tsx'

export default {
  actions: {
    index() {
      return render(<HomePage />)
    },
  },
} satisfies Controller<typeof routes.home, AppContext>
```

## `app/ui/document.tsx`

```tsx
import type { Handle, RemixNode } from 'remix/ui'

export function Document(handle: Handle<{ title?: string; children: RemixNode }>) {
  return () => (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{handle.props.title ?? 'My App'}</title>
      </head>
      <body>{handle.props.children}</body>
    </html>
  )
}
```

## Where to grow from here

| Need                       | Add                                                  |
|---------------------------|------------------------------------------------------|
| Logs in dev                | `logger()` to the middleware array                  |
| Form submissions            | `formData({ uploadHandler })`                         |
| Database                   | `app/data/schema.ts` + `app/middleware/database.ts` |
| Sessions                   | `session(cookie, storage)` in the middleware stack   |
| Auth                       | `loadAuth()`, plus `requireAuth()` on protected routes |
| Tests                      | `app/test-helpers.ts` + `*.test.ts` files            |
