#!/usr/bin/env bun
// Scaffolds a minimal Remix v3 project in the current directory (or under
// --name <dir>), equivalent to `remix new`.
//
// Usage:
//   bun run scripts/init-project.ts --name my-app --app-name "My App"
//
// Generates: package.json, tsconfig.json, server.ts, app/router.ts,
// app/routes.ts, app/controllers/home.tsx, app/ui/document.tsx,
// app/utils/render.tsx, .gitignore.

import * as path from 'node:path'
import { parseArgs, require_, writeFileSafe, info } from './_shared.ts'

const args = parseArgs(process.argv.slice(2))
const dirName  = (args.name as string) ?? '.'
const appName  = (args['app-name'] as string) ?? (dirName === '.' ? 'My App' : dirName)
const base     = path.resolve(dirName)

info(`scaffolding ${appName} into ${base}`)

writeFileSafe(path.join(base, 'package.json'), `{
  "name": ${JSON.stringify(dirName === '.' ? 'app' : dirName)},
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
`)

writeFileSafe(path.join(base, 'tsconfig.json'), `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "jsxImportSource": "remix/ui",
    "types": ["node"]
  },
  "include": ["app", "server.ts"]
}
`)

writeFileSafe(path.join(base, '.gitignore'), `node_modules/
dist/
build/
.DS_Store
*.log
.env
.env.*.local
db/*.sqlite
`)

writeFileSafe(path.join(base, 'server.ts'), `import * as http from 'node:http'
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
  console.log(\`listening on http://localhost:\${port}\`)
})
`)

writeFileSafe(path.join(base, 'app/routes.ts'), `import { route } from 'remix/routes'

export const routes = route({
  home: '/',
})
`)

writeFileSafe(path.join(base, 'app/router.ts'), `import { createRouter } from 'remix/fetch-router'
import { staticFiles } from 'remix/static-middleware'

import { routes } from './routes.ts'
import home from './controllers/home.tsx'

export const router = createRouter({
  middleware: [
    staticFiles('./public', { cacheControl: 'public, max-age=3600' }),
  ],
})

router.map(routes.home, home)

export type AppContext = Parameters<typeof router.fetch>[0] extends Request ? unknown : never
`)

writeFileSafe(path.join(base, 'app/controllers/home.tsx'), `import type { Controller } from 'remix/fetch-router'

import { routes } from '../routes.ts'
import { render } from '../utils/render.tsx'
import { HomePage } from '../views/home-page.tsx'

export default {
  actions: {
    index() {
      return render(<HomePage title=${JSON.stringify(appName)} />)
    },
  },
} satisfies Controller<typeof routes.home>
`)

writeFileSafe(path.join(base, 'app/views/home-page.tsx'), `import { css } from 'remix/ui'

const main = css({ padding: '2rem', fontFamily: 'system-ui', maxWidth: 720, margin: '0 auto' })
const title = css({ fontSize: '2.25rem', marginBottom: '0.5rem' })

export function HomePage(handle: { props: { title: string } }) {
  return () => (
    <main mix={main}>
      <h1 mix={title}>{handle.props.title}</h1>
      <p>Welcome — this page was rendered on the server by Remix.</p>
    </main>
  )
}
`)

writeFileSafe(path.join(base, 'app/ui/document.tsx'), `import type { Handle, RemixNode } from 'remix/ui'

export function Document(handle: Handle<{ title?: string; children: RemixNode }>) {
  return () => (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{handle.props.title ?? ${JSON.stringify(appName)}}</title>
      </head>
      <body>{handle.props.children}</body>
    </html>
  )
}
`)

writeFileSafe(path.join(base, 'app/utils/render.tsx'), `import type { RemixNode } from 'remix/ui'
import { renderToStream } from 'remix/ui/server'

import { Document } from '../ui/document.tsx'

export function render(node: RemixNode, init: ResponseInit & { title?: string } = {}): Response {
  const { title, ...rest } = init
  const stream = renderToStream(<Document title={title}>{node}</Document>)
  return new Response(stream, {
    ...rest,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...rest.headers },
  })
}
`)

console.log()
console.log(`\x1b[32m✓\x1b[0m project scaffolded`)
console.log(`  cd ${dirName}  && npm install  && npm run dev`)
