# Local Scaffolders — the Bun scripts shipped with this plugin

The `scripts/` directory contains Bun scripts that scaffold common files in the user's *current working directory*. Run each with `bun run scripts/<name>.ts`. Every script is idempotent: it prints exactly what it created and exits non-zero on conflict instead of overwriting.

## `scripts/init-project.ts`

Equivalent to `remix new`, useful when the CLI isn't installed yet.

```pwsh
bun run scripts/init-project.ts --name my-app --app-name "My App"
```

Generates: `package.json`, `tsconfig.json`, `server.ts`, `app/router.ts`, `app/routes.ts`, `app/controllers/home.tsx`, `app/ui/document.tsx`, `app/utils/render.tsx`, `.gitignore`.

## `scripts/create-route.ts`

Adds a top-level route to `app/routes.ts` and stubs a matching controller.

```pwsh
bun run scripts/create-route.ts --name about --pattern /about
bun run scripts/create-route.ts --name profile --pattern /users/:userId --method get
```

Effect:
- Inserts the entry into `app/routes.ts`.
- Creates `app/controllers/<name>.tsx` with a default `Controller<typeof routes.<name>>`.
- Adds the `router.map(routes.<name>, <name>)` line in `app/router.ts`.

## `scripts/create-controller.ts`

If a route already exists but its controller doesn't, this creates just the controller and wires it up.

```pwsh
bun run scripts/create-controller.ts --route admin.books
```

Reads `app/routes.ts` for the shape; produces a `Controller<typeof routes.admin.books>` with all required actions.

## `scripts/create-resource.ts`

Adds a `resources('…')` block plus the seven action stubs.

```pwsh
bun run scripts/create-resource.ts --name reviews --param reviewId
bun run scripts/create-resource.ts --name books   --param bookId --only index,show,new,create
```

Effect:
- Inserts `reviews: resources('reviews', { param: 'reviewId' })` into the route map (under a parent prefix if `--parent admin` is passed).
- Creates `app/controllers/reviews/controller.tsx` with `index`, `new`, `create`, `show`, `edit`, `update`, `destroy` (or just those in `--only`).
- Wires `router.map(routes.reviews, reviews)` into `app/router.ts`.

## `scripts/create-migration.ts`

Drops a new file in `db/migrations/` with the current timestamp.

```pwsh
bun run scripts/create-migration.ts --name add_reviews_table
# → db/migrations/<YYYYMMDDHHMMSS>_add_reviews_table.ts
```

The file exports a `createMigration({ up, down })` with empty bodies — fill in the schema changes.

## `scripts/add-middleware.ts`

Inserts a built-in middleware into `app/router.ts` at the correct position in the stack.

```pwsh
bun run scripts/add-middleware.ts --name logger
bun run scripts/add-middleware.ts --name session
bun run scripts/add-middleware.ts --name compression
```

Knows the canonical ordering (see middleware/references/ordering.md) and inserts the new entry where it belongs.

## Why Bun?

- Native TypeScript execution — no transpile step.
- Fast start (~10 ms) makes the scripts feel like normal CLI tools.
- The same Bun runtime users already have for `bun run` or `bunx remix`.

If Bun isn't installed, the scripts also work under `node --experimental-strip-types scripts/<name>.ts` on Node ≥ 22.6.0.

## Convention

Every script:
1. Parses `--flag value` arguments using a tiny built-in parser (no deps).
2. Reads the current file's content with `fs.readFile`, mutates strings, writes back with `fs.writeFile`.
3. Pretty-prints the diff in the terminal — green for additions.
4. Exits 0 on success, 1 on conflict, 2 on invalid args.

Read the scripts before running them on a real project — they're short and explicit.
