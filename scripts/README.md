# Scaffolding Scripts

Project-local Bun scripts that scaffold common files. They run under Bun by default and also work under Node ≥ 22.6.0 with `--experimental-strip-types`.

Every script:

- Parses `--flag value` argv pairs (no deps).
- Refuses to overwrite existing files (exit code 2).
- Prints diffs with green/cyan markers.

## Scripts

| Script | Purpose |
|--------|---------|
| `init-project.ts`     | Scaffold a fresh Remix v3 project layout |
| `create-route.ts`     | Add a route + controller + router.map() wiring |
| `create-resource.ts`  | Add a `resources(...)` block + REST controller |
| `create-controller.ts`| Stub a controller for an existing route |
| `create-migration.ts` | Drop a timestamped migration file under `db/migrations/` |
| `add-middleware.ts`   | Insert a built-in middleware into `app/router.ts` |
| `verify.ts`           | Parallel verification harness — typechecks the examples + smoke-tests every scaffolder against the real Remix package (~7s on a primed cache) |
| `check-upstream.ts`   | Compare cached remix version vs npm @next; exits 1 on drift. Use weekly. |
| `install-hooks.sh`    | Wires `scripts/hooks/*` into `.git/hooks/`. **Run once per clone.** |
| `hooks/pre-commit`    | Runs `verify.ts` before commits that touch plugin-relevant paths. Skips README-only changes. |

## Usage examples

```pwsh
# brand new project
bun run scripts/init-project.ts --name my-app --app-name "My App"

# add a simple route
bun run scripts/create-route.ts --name about --pattern /about

# add a RESTful resource
bun run scripts/create-resource.ts --name reviews --param reviewId

# generate a migration
bun run scripts/create-migration.ts --name add_reviews_table

# wire in middleware
bun run scripts/add-middleware.ts --name session
bun run scripts/add-middleware.ts --name logger

# run the full verification harness before tagging a release
bun run scripts/verify.ts
bun run scripts/verify.ts --reprime   # rebuild the cached node_modules
bun run scripts/verify.ts --keep      # keep scratch dirs after run for debugging
```

## verify.ts performance

The first run primes `.verify-cache/node_modules` (~30–60s for npm install).
Subsequent runs reuse it and finish in **~7s** — all 8 checks run in parallel
via `Promise.all`, each in a scratch dir with a symlink to the primed cache.

If a check fails, scratch dirs are kept under `.verify-cache/scratch/<check>/`
so you can `cd` in and reproduce.

## Running under Node

If Bun isn't installed:

```pwsh
node --experimental-strip-types scripts/init-project.ts --name my-app
```

(Node 22.6+; the flag became default-on in Node 23.)
