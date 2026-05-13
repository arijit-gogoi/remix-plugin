---
name: remix-cli
description: The official Remix v3 CLI — `remix new` (scaffold a project), `remix doctor` (health-check + auto-fix), `remix routes` (inspect the route tree), `remix test` (run tests), `remix version`, `remix completion` (shell completions). Includes `runRemix()` for programmatic invocation. Load when bootstrapping a new project, auditing project layout, dumping routes, generating shell completions, or wondering what the official CLI can do.
---

# CLI

The `remix` package ships a CLI binary with six commands. Use it for bootstrap, health checks, route inspection, and running tests.

For project-local scaffolders that the official CLI doesn't ship (add a route, add a resource block, add a migration, insert a middleware in canonical position), see [scaffolders](../scaffolders/SKILL.md).

## Invocation

```pwsh
npx remix@next new my-app           # from anywhere
bunx remix doctor                    # via Bun
remix routes --table                 # if `remix` is a local dep
```

If you've installed `remix` locally, `npm scripts` can call `remix …` directly.

## `remix new <name>`

Scaffolds a fresh project.

| Flag | Purpose |
|---|---|
| `--app-name "…"` | Friendly name written into `package.json` and document title |

```pwsh
remix new my-app --app-name "My App"
```

What `new` generates: see [references/bootstrap-layout.md](./references/bootstrap-layout.md) for the annotated tree (package.json, tsconfig.json, server.ts, app/router.ts, app/routes.ts, app/controllers/, app/ui/, with `dev`/`start`/`test`/`typecheck` scripts wired up).

## `remix doctor`

Health-checks the project for Remix v3 conventions.

Checks include:
- `package.json` `engines.node` ≥ 24.3.0
- `remix` dep is present and reasonable
- Each `app/controllers/**/controller.tsx` has a correctly-shaped default export
- `app/routes.ts` and `app/router.ts` exist and import from `remix/<subpath>`

```pwsh
remix doctor          # report
remix doctor --fix    # report + apply low-risk auto-fixes
```

`--fix` repairs mis-cased filenames, missing-but-defaultable fields, and similar low-risk drift. Run regularly during refactors.

## `remix routes`

Dumps the route tree from `app/routes.ts`. Three output formats:

```pwsh
remix routes               # tree (default)
remix routes --table       # one row per route
remix routes --json        # machine-readable
```

Useful for PR review — diff the table output before/after to see exactly which URLs changed.

## `remix test [glob]`

Wrapper around the built-in test runner. See [testing](../testing/SKILL.md) for what tests look like, helpers, and patterns.

## `remix version` and `remix completion`

```pwsh
remix version                  # prints CLI + framework version
remix completion bash >> ~/.bashrc
remix completion zsh  >> ~/.zshrc
```

## Programmatic API

```ts
import { runRemix } from 'remix/cli'

await runRemix(['new', 'my-app'])
await runRemix(['doctor', '--fix'])
await runRemix(['routes', '--table', '--no-headers'])
```

Returns the CLI exit code. Useful in build scripts, CI checks, and meta-tooling.

## What the CLI does NOT do

The official CLI does scaffold + audit + inspect + run-tests. It does NOT:
- Add a single new route to an existing project
- Add a `resources(...)` block with all 7 actions
- Generate a timestamped migration file
- Insert a middleware in canonical position in `app/router.ts`

For those, this plugin ships Bun scaffolders — see [scaffolders](../scaffolders/SKILL.md).

## Further reading

- [`references/cli-reference.md`](./references/cli-reference.md) — every CLI flag, every subcommand, every exit code
- [`references/bootstrap-layout.md`](./references/bootstrap-layout.md) — annotated walk-through of what `remix new` produces
- See also: [scaffolders](../scaffolders/SKILL.md) (this plugin's Bun scripts), [build](../build/SKILL.md) (what runs after bootstrap), [testing](../testing/SKILL.md) (what `remix test` invokes)
