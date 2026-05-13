#!/usr/bin/env bun
// Inserts a built-in middleware into app/router.ts in the canonical position
// for the stack.
//
// Usage:
//   bun run scripts/add-middleware.ts --name logger
//   bun run scripts/add-middleware.ts --name session
//   bun run scripts/add-middleware.ts --name compression

import * as path from 'node:path'
import { parseArgs, require_, readFile, writeFile, info } from './_shared.ts'

type Built = {
  importLine: string
  factoryCall: string
  // Lower is earlier in the chain
  order: number
}

const SHIPPED: Record<string, Built> = {
  logger:         { order: 10, importLine: `import { logger } from 'remix/logger-middleware'`,                  factoryCall: `logger()` },
  compression:    { order: 20, importLine: `import { compression } from 'remix/compression-middleware'`,        factoryCall: `compression()` },
  staticFiles:    { order: 30, importLine: `import { staticFiles } from 'remix/static-middleware'`,             factoryCall: `staticFiles('./public', { cacheControl: 'public, max-age=3600' })` },
  formData:       { order: 40, importLine: `import { formData } from 'remix/form-data-middleware'`,             factoryCall: `formData({ uploadHandler })` },
  methodOverride: { order: 50, importLine: `import { methodOverride } from 'remix/method-override-middleware'`, factoryCall: `methodOverride()` },
  session:        { order: 60, importLine: `import { session } from 'remix/session-middleware'`,                factoryCall: `session(sessionCookie, sessionStorage)` },
  asyncContext:   { order: 70, importLine: `import { asyncContext } from 'remix/async-context-middleware'`,     factoryCall: `asyncContext()` },
}

const args = parseArgs(process.argv.slice(2))
const name = require_(args, 'name')
const built = SHIPPED[name]
if (!built) {
  console.error(`unknown middleware: ${name}. Known: ${Object.keys(SHIPPED).join(', ')}`)
  process.exit(2)
}

const routerPath = path.resolve('app/router.ts')
const src = readFile(routerPath)

if (src.includes(built.factoryCall.split('(')[0] + '(')) {
  info(`router.ts already calls ${built.factoryCall.split('(')[0]}() — skipping`)
  process.exit(0)
}

let next = src

// Add the import line (after the last import).
if (!next.includes(built.importLine)) {
  const last = [...next.matchAll(/^import .*\n/gm)].at(-1)
  if (last) {
    const idx = last.index! + last[0].length
    next = next.slice(0, idx) + built.importLine + '\n' + next.slice(idx)
  } else {
    next = built.importLine + '\n' + next
  }
}

// Insert the factory call inside the middleware array.
next = next.replace(
  /middleware:\s*\[([\s\S]*?)\]/,
  (_m, inside) => `middleware: [\n${(inside as string).trim()}${inside.trim() ? ',\n' : ''}    ${built.factoryCall},\n  ]`,
)

writeFile(routerPath, next)

console.log()
console.log(`\x1b[32m✓\x1b[0m added ${name} middleware`)
console.log(`  Note: review ordering. See skills/middleware/references/ordering.md.`)
