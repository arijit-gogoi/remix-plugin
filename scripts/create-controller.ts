#!/usr/bin/env bun
// Stubs a Controller<typeof routes.<dotted>> file for a route that already
// exists in app/routes.ts. Useful when a teammate added the route entry but
// not the controller file.
//
// Usage:
//   bun run scripts/create-controller.ts --route home
//   bun run scripts/create-controller.ts --route admin.books
//
// Note: For RouteMap targets (e.g. a `resources(...)` block with seven
// actions), this stub only emits `index`. Fill in the rest, or use
// `create-resource.ts` from scratch which emits the full set.

import * as path from 'node:path'
import { parseArgs, require_, writeFileSafe, info, die } from './_shared.ts'

const args   = parseArgs(process.argv.slice(2))
const dotted = require_(args, 'route')                       // e.g. 'admin.books'

if (!/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)*$/.test(dotted)) {
  die(`--route must be dot-separated JS identifiers (e.g. 'admin.books'). Got: ${dotted}`)
}

const segments = dotted.split('.')
const depth    = segments.length + 1   // file is at app/controllers/<…>/controller.tsx
const relUp    = Array(depth).fill('..').join('/')
const relImport    = `${relUp}/routes.ts`
const renderImport = `${relUp}/utils/render.tsx`

const filePath = path.resolve(`app/controllers/${segments.join('/')}/controller.tsx`)

const body = `import type { Controller } from 'remix/fetch-router'

import { routes } from '${relImport}'
import { render } from '${renderImport}'

// If routes.${dotted} is a RouteMap (e.g. from resources(...)), add the
// matching actions for each leaf below. tsc will tell you which are missing.
export default {
  actions: {
    index() {
      return render(<p>${dotted}</p>)
    },
  },
} satisfies Controller<typeof routes.${dotted}>
`

writeFileSafe(filePath, body)

info(`now add to app/router.ts:`)
info(`    import ${segments.at(-1)} from './controllers/${segments.join('/')}/controller.tsx'`)
info(`    router.map(routes.${dotted}, ${segments.at(-1)})`)
