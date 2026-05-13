#!/usr/bin/env bun
// Stubs a Controller<typeof routes.<dotted>> file for a route that already
// exists in app/routes.ts. Useful when a teammate added the route entry but
// not the file.
//
// Usage:
//   bun run scripts/create-controller.ts --route home
//   bun run scripts/create-controller.ts --route admin.books

import * as path from 'node:path'
import { parseArgs, require_, writeFileSafe, info } from './_shared.ts'

const args  = parseArgs(process.argv.slice(2))
const dotted = require_(args, 'route')                  // e.g. 'admin.books'

const segments = dotted.split('.')
const relImport = segments.map(() => '..').join('/') + '/routes.ts'
const renderImport = segments.map(() => '..').join('/') + '/utils/render.tsx'

const filePath = path.resolve(`app/controllers/${segments.join('/')}/controller.tsx`)

const body = `import type { Controller } from 'remix/fetch-router'

import { routes } from '${relImport}'
import { render } from '${renderImport}'

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
