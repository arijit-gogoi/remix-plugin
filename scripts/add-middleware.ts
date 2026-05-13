#!/usr/bin/env bun
// Inserts a built-in middleware into app/router.ts at the canonical position
// for the request stack (lower `order` runs earlier).
//
// Usage:
//   bun run scripts/add-middleware.ts --name logger
//   bun run scripts/add-middleware.ts --name session
//   bun run scripts/add-middleware.ts --name compression
//   bun run scripts/add-middleware.ts --name csrf

import * as path from 'node:path'
import { parseArgs, require_, readFile, writeFile, info, die } from './_shared.ts'

type Built = {
  importLine: string
  factoryCall: string
  order: number
}

// Ordering follows the canonical stack from skills/middlewares/SKILL.md.
const SHIPPED: Record<string, Built> = {
  cors:           { order:  5, importLine: `import { cors } from 'remix/cors-middleware'`,                      factoryCall: `cors({ origin: '*' })` },
  logger:         { order: 10, importLine: `import { logger } from 'remix/logger-middleware'`,                  factoryCall: `logger()` },
  cop:            { order: 15, importLine: `import { cop } from 'remix/cop-middleware'`,                        factoryCall: `cop()` },
  compression:    { order: 20, importLine: `import { compression } from 'remix/compression-middleware'`,        factoryCall: `compression()` },
  staticFiles:    { order: 30, importLine: `import { staticFiles } from 'remix/static-middleware'`,             factoryCall: `staticFiles('./public', { cacheControl: 'public, max-age=3600' })` },
  formData:       { order: 40, importLine: `import { formData } from 'remix/form-data-middleware'`,             factoryCall: `formData({})` },
  methodOverride: { order: 50, importLine: `import { methodOverride } from 'remix/method-override-middleware'`, factoryCall: `methodOverride()` },
  session:        { order: 60, importLine: `import { session } from 'remix/session-middleware'`,                factoryCall: `session(sessionCookie, sessionStorage)` },
  csrf:           { order: 65, importLine: `import { csrf } from 'remix/csrf-middleware'`,                      factoryCall: `csrf()` },
  asyncContext:   { order: 70, importLine: `import { asyncContext } from 'remix/async-context-middleware'`,     factoryCall: `asyncContext()` },
}

const args = parseArgs(process.argv.slice(2))
const name = require_(args, 'name')
const built = SHIPPED[name]
if (!built) {
  die(`unknown middleware: ${name}. Known: ${Object.keys(SHIPPED).join(', ')}`)
}

const routerPath = path.resolve('app/router.ts')
const src = readFile(routerPath)

const factoryName = built.factoryCall.split('(')[0]
if (new RegExp(`\\b${factoryName}\\s*\\(`).test(src)) {
  info(`router.ts already calls ${factoryName}() — skipping`)
  process.exit(0)
}

let next = src

// 1. Add the import line (after the last existing import) if missing.
if (!next.includes(built.importLine)) {
  const last = [...next.matchAll(/^import .*\n/gm)].at(-1)
  if (last) {
    const idx = last.index! + last[0].length
    next = next.slice(0, idx) + built.importLine + '\n' + next.slice(idx)
  } else {
    next = built.importLine + '\n' + next
  }
}

// 2. Parse the existing middleware array. Each entry is one item already in
//    the canonical stack — we splice the new one in by `order`.
const arrayMatch = next.match(/middleware:\s*\[([\s\S]*?)\]/)
if (!arrayMatch) {
  die(`could not find a 'middleware: [...]' array in app/router.ts`)
}

// Pull entries out, ignoring blank lines and trailing commas.
const inside = arrayMatch[1]
const entries: { call: string; order: number }[] = []
for (const raw of inside.split('\n').map((l) => l.trim()).filter(Boolean)) {
  const call = raw.replace(/,$/, '').trim()
  if (!call) continue
  // Look up order by factory name.
  const fname = call.split('(')[0]
  const known = Object.values(SHIPPED).find((b) => b.factoryCall.split('(')[0] === fname)
  entries.push({ call, order: known?.order ?? 999 })
}

entries.push({ call: built.factoryCall, order: built.order })
entries.sort((a, b) => a.order - b.order)

const rebuilt = `middleware: [\n${entries.map((e) => `    ${e.call},`).join('\n')}\n  ]`
next = next.replace(/middleware:\s*\[[\s\S]*?\]/, rebuilt)

writeFile(routerPath, next)

console.log()
console.log(`\x1b[32m✓\x1b[0m added ${name} middleware (sorted by canonical order)`)
