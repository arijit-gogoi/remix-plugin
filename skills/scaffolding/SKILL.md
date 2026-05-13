---
name: remix-scaffolding
description: Bootstrapping and managing a Remix v3 project — the remix CLI commands (new, doctor, routes, test, version, completion), what the bootstrap template generates, and the project-local Bun scaffolders shipped with this plugin (create-route, create-controller, init-project). Load when the user is starting a new project, running `remix doctor` to debug a layout, or asking how the CLI works.
---

# Scaffolding

The `remix` package ships a CLI binary. The most useful subcommands are `new`, `doctor`, `routes`, and `test`.

## Imports / invocation

```pwsh
npx remix@next new my-app
npx remix doctor
npx remix routes --table
npx remix test
```

If `remix` is already a dependency, `npm run …` or `bunx remix …` skips the network round-trip.

## `remix new <name>`

Scaffolds a fresh project. Flags:

| Flag             | Purpose                                                            |
|------------------|--------------------------------------------------------------------|
| `--app-name "…"` | Friendly name written into `package.json` and the document title    |

What `new` generates:

```
my-app/
├── app/
│   ├── controllers/
│   │   ├── auth.tsx
│   │   └── home.tsx
│   ├── ui/
│   │   └── document.tsx
│   ├── router.ts
│   └── routes.ts
├── package.json
├── server.ts
└── tsconfig.json
```

…with `dev` / `start` / `test` / `typecheck` scripts wired up.

## `remix doctor`

Health-checks the project for the conventions Remix v3 expects:

- `package.json` has `engines.node` ≥ 24.3.0
- `remix` dep is present
- Each `app/controllers/**/controller.tsx` has a correctly-shaped default export
- `app/routes.ts` and `app/router.ts` exist and import from `remix/<subpath>`

With `--fix`, low-risk issues are repaired automatically.

```pwsh
remix doctor          # report
remix doctor --fix    # report + auto-fix
```

## `remix routes`

Dumps the route tree from `app/routes.ts`. Three output formats:

```pwsh
remix routes               # tree (default)
remix routes --table       # one row per route
remix routes --json        # machine-readable
```

Useful when reviewing a PR that touches routing — you can diff the table before and after.

## `remix test [glob]`

Wrapper around the built-in test runner. See [testing](../testing/SKILL.md).

## `remix version` and `remix completion`

```pwsh
remix version                  # prints CLI + framework version
remix completion bash >> ~/.bashrc
remix completion zsh  >> ~/.zshrc
```

## Project-local scaffolders (this plugin)

The `scripts/` directory in this plugin contains Bun-powered scaffolders. Each script writes files into the user's *current* working directory:

| Script                            | What it does                                              |
|-----------------------------------|-----------------------------------------------------------|
| `scripts/init-project.ts`          | Mirrors `remix new` for environments without the CLI       |
| `scripts/create-route.ts`          | Adds an entry to `app/routes.ts` + a stub controller       |
| `scripts/create-controller.ts`     | Generates a `.tsx` controller scaffold for an existing route |
| `scripts/create-resource.ts`       | Adds a `resources('…')` block and the seven action stubs   |
| `scripts/create-migration.ts`      | Drops a new migration file under `db/migrations/`          |

Run them:

```pwsh
bun run scripts/create-route.ts --name books --pattern /books --param slug
bun run scripts/create-resource.ts --name orders --param orderId --only index,show
bun run scripts/create-migration.ts --name add_reviews_table
```

Each script is idempotent and prints exactly what files it created or edited.

## Minimum `package.json`

```json
{
  "name": "my-app",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24.3.0" },
  "scripts": {
    "dev": "tsx watch server.ts",
    "start": "tsx server.ts",
    "test": "remix test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "remix": "next",
    "tsx": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^24",
    "typescript": "^5.6.0"
  }
}
```

## Minimum `server.ts`

```ts
import * as http from 'node:http'
import { createRequestListener } from 'remix/node-fetch-server'
import { router } from './app/router.ts'

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

server.listen(Number(process.env.PORT ?? 3000), () => {
  console.log(`listening on http://localhost:${process.env.PORT ?? 3000}`)
})
```

For an integrated example, see `examples/minimal/` and `examples/bookstore-mini/` in this plugin.

## Further reading

- `references/cli-reference.md` — every CLI flag, every subcommand
- `references/bootstrap-layout.md` — annotated walk-through of what `remix new` produces
- `references/local-scaffolders.md` — full reference for the Bun scripts shipped here
