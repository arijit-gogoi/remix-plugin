#!/usr/bin/env bun
// Adds a resources('…') block to app/routes.ts and stubs a controller mirror.
//
// Usage:
//   bun run scripts/create-resource.ts --name reviews --param reviewId
//   bun run scripts/create-resource.ts --name books --param bookId --only index,show,new,create
//
// Flags:
//   --name   JS-identifier-safe key (camelCase, no hyphens). Also the URL
//            segment and the controller directory name.
//   --param  URL param name (e.g. reviewId). Required.
//   --only   comma list of actions to include
//            (index|new|create|show|edit|update|destroy). All if omitted.

import * as path from 'node:path'
import { parseArgs, require_, readFile, writeFile, writeFileSafe, info, die } from './_shared.ts'

const args  = parseArgs(process.argv.slice(2))
const name  = require_(args, 'name')
const param = require_(args, 'param')
const only  = (args.only as string | undefined)?.split(',').map((s) => s.trim()).filter(Boolean)

if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
  die(`--name must be a valid JS identifier (camelCase, no hyphens). Got: ${name}`)
}

const ALL = ['index', 'new', 'create', 'show', 'edit', 'update', 'destroy'] as const
const actions = (only && only.length > 0)
  ? only.filter((a): a is (typeof ALL)[number] => (ALL as readonly string[]).includes(a))
  : [...ALL]

const SUBPATH = 'remix/fetch-router/routes'

// ── app/routes.ts
const routesPath = path.resolve('app/routes.ts')
let routesSrc    = readFile(routesPath)

if (!routesSrc.includes(`from '${SUBPATH}'`)) {
  routesSrc = `import { route, resources } from '${SUBPATH}'\n\n${routesSrc}`
} else if (!new RegExp(`import\\s*\\{[^}]*\\bresources\\b[^}]*\\}\\s*from\\s*'${SUBPATH.replace(/\//g, '\\/')}'`).test(routesSrc)) {
  routesSrc = routesSrc.replace(
    new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*'${SUBPATH.replace(/\//g, '\\/')}'`),
    (_m, inside) => `import {${inside.trim()}, resources} from '${SUBPATH}'`,
  )
}

const entry = only
  ? `  ${name}: resources(${JSON.stringify(name)}, { param: ${JSON.stringify(param)}, only: ${JSON.stringify(actions)} }),`
  : `  ${name}: resources(${JSON.stringify(name)}, { param: ${JSON.stringify(param)} }),`

if (routesSrc.includes(`${name}: resources`)) {
  info(`routes.ts already has resource "${name}" — skipping`)
} else {
  routesSrc = routesSrc.replace(
    /export const routes = route\(\{/,
    (m) => `${m}\n${entry}`,
  )
  writeFile(routesPath, routesSrc)
}

// ── app/controllers/<name>/controller.tsx
const controllerPath = path.resolve(`app/controllers/${name}/controller.tsx`)

// Build action stubs. Avoid destructuring args that aren't used, and avoid
// `${…}` inside the generated JSX (it would interpolate at generation time).
type ActionName = (typeof ALL)[number]
const handlers: Record<ActionName, string> = {
  index:   `    index() { return render(<p>${name} index</p>) },`,
  new:     `    new() { return render(<p>new ${name.replace(/s$/, '')}</p>) },`,
  create:  `    async create(_ctx: RequestContext) { return new Response('TODO', { status: 501 }) },`,
  show:    `    show(ctx: RequestContext<{ ${param}: string }>) { return render(<p>${name} {ctx.params.${param}}</p>) },`,
  edit:    `    edit(ctx: RequestContext<{ ${param}: string }>) { return render(<p>edit ${name} {ctx.params.${param}}</p>) },`,
  update:  `    async update(_ctx: RequestContext<{ ${param}: string }>) { return new Response('TODO', { status: 501 }) },`,
  destroy: `    async destroy(_ctx: RequestContext<{ ${param}: string }>) { return new Response('TODO', { status: 501 }) },`,
}

const body = actions.map((a) => handlers[a]).join('\n')

writeFileSafe(controllerPath, `import type { Controller, RequestContext } from 'remix/fetch-router'

import { routes } from '../../routes.ts'
import { render } from '../../utils/render.tsx'

export default {
  actions: {
${body}
  },
} satisfies Controller<typeof routes.${name}>
`)

// ── app/router.ts
const routerPath = path.resolve('app/router.ts')
const routerSrc  = readFile(routerPath)
if (routerSrc.includes(`router.map(routes.${name},`)) {
  info(`router.ts already maps routes.${name}`)
} else {
  const importInsert = `import ${name}Controller from './controllers/${name}/controller.tsx'\n`
  const mapInsert    = `router.map(routes.${name}, ${name}Controller)\n`
  let next = routerSrc
  const last = [...next.matchAll(/^import .*\n/gm)].at(-1)
  if (last) {
    const idx = last.index! + last[0].length
    next = next.slice(0, idx) + importInsert + next.slice(idx)
  } else {
    next = importInsert + next
  }
  next = next.replace(/\n*$/, `\n${mapInsert}`)
  writeFile(routerPath, next)
}

console.log()
console.log(`\x1b[32m✓\x1b[0m resource "${name}" with actions: ${actions.join(', ')}`)
