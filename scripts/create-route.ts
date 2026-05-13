#!/usr/bin/env bun
// Adds a top-level route to app/routes.ts and stubs a matching controller +
// router.map() line in app/router.ts.
//
// Usage:
//   bun run scripts/create-route.ts --name about --pattern /about
//   bun run scripts/create-route.ts --name profile --pattern /users/:userId --method get
//
// Flags:
//   --name      route key in routes.ts AND filename of the controller (kebab-case)
//   --pattern   URL pattern (e.g. /about, /users/:userId)
//   --method    optional: one of get|post|put|del|patch — pins the HTTP verb

import * as path from 'node:path'
import { parseArgs, require_, readFile, writeFile, writeFileSafe, info } from './_shared.ts'

const args = parseArgs(process.argv.slice(2))
const name    = require_(args, 'name')
const pattern = require_(args, 'pattern')
const method  = (args.method as string | undefined)?.toLowerCase()

if (method && !['get', 'post', 'put', 'del', 'patch'].includes(method)) {
  console.error(`--method must be one of get|post|put|del|patch (got: ${method})`)
  process.exit(2)
}

// ── app/routes.ts: add the entry
const routesPath = path.resolve('app/routes.ts')
const routesSrc  = readFile(routesPath)

const importLine = method
  ? `import { route, ${method} } from 'remix/routes'`
  : `import { route } from 'remix/routes'`

const entry = method
  ? `  ${name}: ${method}(${JSON.stringify(pattern)}),`
  : `  ${name}: ${JSON.stringify(pattern)},`

let nextRoutesSrc = routesSrc
if (!nextRoutesSrc.includes(`from 'remix/routes'`)) {
  nextRoutesSrc = `${importLine}\n\n${nextRoutesSrc}`
} else if (method && !new RegExp(`\\b${method}\\b`).test(nextRoutesSrc)) {
  nextRoutesSrc = nextRoutesSrc.replace(
    /from 'remix\/routes'/,
    `from 'remix/routes'`,
  ).replace(
    /import \{([^}]+)\} from 'remix\/routes'/,
    (_m, inside) => `import {${inside.trim()}, ${method}} from 'remix/routes'`,
  )
}

if (nextRoutesSrc.includes(`${name}:`)) {
  info(`routes.ts already has a "${name}" entry — skipping route insertion`)
} else {
  nextRoutesSrc = nextRoutesSrc.replace(
    /export const routes = route\(\{/,
    (m) => `${m}\n${entry}`,
  )
  writeFile(routesPath, nextRoutesSrc)
}

// ── app/controllers/<name>.tsx: stub a controller
const controllerPath = path.resolve(`app/controllers/${name}.tsx`)
writeFileSafe(controllerPath, `import type { Controller } from 'remix/fetch-router'

import { routes } from '../routes.ts'
import { render } from '../utils/render.tsx'

export default {
  actions: {
    index() {
      return render(<p>${name} page</p>)
    },
  },
} satisfies Controller<typeof routes.${name}>
`)

// ── app/router.ts: register the route
const routerPath = path.resolve('app/router.ts')
const routerSrc  = readFile(routerPath)

if (routerSrc.includes(`router.map(routes.${name},`)) {
  info(`router.ts already maps routes.${name} — skipping`)
} else {
  const importInsert = `import ${name} from './controllers/${name}.tsx'\n`
  const mapInsert    = `router.map(routes.${name}, ${name})\n`

  let nextRouterSrc = routerSrc

  // Add the controller import after the last existing controller import (or after routes import).
  const lastImportMatch = [...nextRouterSrc.matchAll(/^import .*\n/gm)].at(-1)
  if (lastImportMatch) {
    const idx = lastImportMatch.index! + lastImportMatch[0].length
    nextRouterSrc = nextRouterSrc.slice(0, idx) + importInsert + nextRouterSrc.slice(idx)
  } else {
    nextRouterSrc = importInsert + nextRouterSrc
  }

  // Append the router.map() at the end of the file (before any trailing newline-only).
  nextRouterSrc = nextRouterSrc.replace(/\n*$/, `\n${mapInsert}`)

  writeFile(routerPath, nextRouterSrc)
}

console.log()
console.log(`\x1b[32m✓\x1b[0m route "${name}" -> ${pattern}${method ? ` [${method.toUpperCase()}]` : ''}`)
