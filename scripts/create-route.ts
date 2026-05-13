#!/usr/bin/env bun
// Adds a single top-level Route to app/routes.ts plus a handler stub and a
// router registration in app/router.ts.
//
// Usage:
//   bun run scripts/create-route.ts --name about --pattern /about
//   bun run scripts/create-route.ts --name profile --pattern /users/:userId --method get
//
// Flags:
//   --name      JS-identifier-safe key (camelCase, no hyphens). Becomes the
//               key in routes.ts AND the filename / handler symbol.
//   --pattern   URL pattern. Quote it on Git Bash to avoid MSYS path mangling
//               (--pattern '/about' becomes a Windows path otherwise).
//   --method    optional: one of get|post|put|del|patch|head|options.
//               Pins the HTTP verb on the Route.

import * as path from 'node:path'
import { parseArgs, require_, readFile, writeFile, writeFileSafe, info, die } from './_shared.ts'

const args = parseArgs(process.argv.slice(2))
const name    = require_(args, 'name')
const pattern = require_(args, 'pattern')
const method  = (args.method as string | undefined)?.toLowerCase()

if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
  die(`--name must be a valid JS identifier (camelCase, no hyphens). Got: ${name}`)
}
if (method && !['get', 'post', 'put', 'del', 'patch', 'head', 'options'].includes(method)) {
  die(`--method must be one of get|post|put|del|patch|head|options. Got: ${method}`)
}
if (!pattern.startsWith('/')) {
  info(`warning: --pattern usually starts with '/'. Got: ${pattern}`)
}
if (pattern.includes(':\\') || pattern.match(/^[A-Z]:\//)) {
  die(`--pattern looks like a Windows path: ${pattern}\nGit Bash expanded a leading "/" — quote the value: --pattern '/about'`)
}

// ── app/routes.ts: add the entry
const routesPath = path.resolve('app/routes.ts')
const routesSrc  = readFile(routesPath)

const SUBPATH = 'remix/fetch-router/routes'

const entry = method
  ? `  ${name}: ${method}(${JSON.stringify(pattern)}),`
  : `  ${name}: ${JSON.stringify(pattern)},`

let nextRoutesSrc = routesSrc

if (!nextRoutesSrc.includes(`from '${SUBPATH}'`)) {
  const importLine = method
    ? `import { route, ${method} } from '${SUBPATH}'`
    : `import { route } from '${SUBPATH}'`
  nextRoutesSrc = `${importLine}\n\n${nextRoutesSrc}`
} else if (method && !new RegExp(`import\\s*\\{[^}]*\\b${method}\\b[^}]*\\}\\s*from\\s*'${SUBPATH.replace(/\//g, '\\/')}'`).test(nextRoutesSrc)) {
  nextRoutesSrc = nextRoutesSrc.replace(
    new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*'${SUBPATH.replace(/\//g, '\\/')}'`),
    (_m, inside) => `import {${inside.trim()}, ${method}} from '${SUBPATH}'`,
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

// ── app/controllers/<name>.tsx: stub a single-route handler
const controllerPath = path.resolve(`app/controllers/${name}.tsx`)
writeFileSafe(controllerPath, `import type { RequestContext } from 'remix/fetch-router'

import { render } from '../utils/render.tsx'

export function ${name}(_context: RequestContext) {
  return render(<p>${name} page</p>)
}
`)

// ── app/router.ts: register the route
const routerPath = path.resolve('app/router.ts')
const routerSrc  = readFile(routerPath)

if (routerSrc.includes(`router.map(routes.${name},`)) {
  info(`router.ts already maps routes.${name} — skipping`)
} else {
  const importInsert = `import { ${name} } from './controllers/${name}.tsx'\n`
  const mapInsert    = `router.map(routes.${name}, ${name})\n`

  let nextRouterSrc = routerSrc

  const lastImportMatch = [...nextRouterSrc.matchAll(/^import .*\n/gm)].at(-1)
  if (lastImportMatch) {
    const idx = lastImportMatch.index! + lastImportMatch[0].length
    nextRouterSrc = nextRouterSrc.slice(0, idx) + importInsert + nextRouterSrc.slice(idx)
  } else {
    nextRouterSrc = importInsert + nextRouterSrc
  }

  nextRouterSrc = nextRouterSrc.replace(/\n*$/, `\n${mapInsert}`)

  writeFile(routerPath, nextRouterSrc)
}

console.log()
console.log(`\x1b[32m✓\x1b[0m route "${name}" -> ${pattern}${method ? ` [${method.toUpperCase()}]` : ''}`)
