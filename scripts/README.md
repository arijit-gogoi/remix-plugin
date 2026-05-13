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
```

## Running under Node

If Bun isn't installed:

```pwsh
node --experimental-strip-types scripts/init-project.ts --name my-app
```

(Node 22.6+; the flag became default-on in Node 23.)
