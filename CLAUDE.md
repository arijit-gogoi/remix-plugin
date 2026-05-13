# remix-plugin

Claude Code plugin: comprehensive Remix v3 reference. Published at `arijit-gogoi/remix-plugin`, distributed via `arijit-gogoi/ari-marketplace`.

## Repo map

```
.claude-plugin/plugin.json   ← name, version, description
skills/                      ← 15 sub-skills (each: SKILL.md + references/*.md)
  remix/                     ← root entrypoint; topic table; "Don't reach for these"
  routing controllers data-table validation auth security sessions cookies
  middlewares forms-uploads file-storage ui-framework testing scaffolding migrations
scripts/                     ← Bun scaffolders + verify.ts
examples/
  minimal/                   ← smallest viable app (5 files)
  bookstore-mini/            ← realistic slice: controllers + data-table + sessions + admin CRUD
```

## Verify before every tag

```pwsh
bun run scripts/verify.ts          # ~7s on a primed cache, 1m on first run
bun run scripts/verify.ts --reprime  # rebuild .verify-cache/ from scratch
bun run scripts/verify.ts --keep     # retain scratch dirs after run
```

Runs 8 checks in parallel: tsc on both examples + smoke-test on every scaffolder. Exit code is the source of truth. **Do not tag without it green.**

GitHub Actions runs `verify.ts --reprime` on push, PR, and weekly (Mondays 12:00 UTC) — see `.github/workflows/verify.yml`. A red cron means upstream drift; patch and ship `v0.x.y`.

Check upstream version without re-priming the cache:

```pwsh
bun run scripts/check-upstream.ts   # exits 1 if npm @next differs from cache
```

## Adding a sub-skill

1. `skills/<name>/SKILL.md` with frontmatter `name: remix-<name>` and a `description:` that names the trigger words.
2. `skills/<name>/references/*.md` for deep docs (link to them from SKILL.md, don't inline).
3. Add a row to the topic table in `skills/remix/SKILL.md`.
4. Add a row to "Don't reach for these" if it replaces a popular third-party package.
5. Add a row in `README.md`'s "What you get" table.
6. Bump `version` in `.claude-plugin/plugin.json` (new sub-skill = minor bump).
7. `bun run scripts/verify.ts` → tag → push → bump marketplace ref.

## Import paths — non-obvious gotchas

- Route helpers: `remix/fetch-router/routes` (NOT `remix/routes` — doesn't exist)
- Operators: come from `remix/data-table` directly (the meta-package re-exports `remix/data-table/operators`)
- Coercion helpers in `remix/data-schema/coerce` are standalone schemas: `coerce.number()` not `coerce.number(s.number())`
- `csrf()` requires `session()` to run before it
- `methodOverride()` must run after `formData()`

## Type drift watchlist (verified against v3.0.0-beta.0)

If `verify.ts` ever fails after a `remix@next` bump, these are the usual suspects:

| Symbol | Real shape |
|---|---|
| Route helper subpath | `remix/fetch-router/routes` |
| Cookie `sameSite` | `'Lax'` (capital L) |
| `coerce.X` | no args: `coerce.number()` |
| Aggregations | none exported; use ``sql`…` `` template |
| `createOIDCAuthProvider` | capital OIDC |
| Table row type | `TableRow<typeof table>` (not `$inferRow`) |
| `Controller<typeof routes.X>` | only for RouteMap targets; leaf Routes need inline handlers |
| tsconfig | needs `allowImportingTsExtensions: true` + `noEmit: true` |

## Scaffolder usage

```pwsh
bun run scripts/init-project.ts     --name my-app --app-name "My App"
bun run scripts/create-route.ts     --name about --pattern //about     # // escapes Git Bash path mangling
bun run scripts/create-resource.ts  --name reviews --param reviewId
bun run scripts/create-migration.ts --name add_reviews_table
bun run scripts/add-middleware.ts   --name session                      # sorts into canonical order
bun run scripts/create-controller.ts --route admin.books               # for existing RouteMap entries
```

All scaffolders: reject hyphenated names, refuse to overwrite, exit 2 on misuse.

## Conventions

- SKILL.md frontmatter `description:` is the discoverability surface — name trigger words.
- Move deep API tables out of SKILL.md into `references/*.md`; SKILL.md should fit on one screen of reading.
- Cross-link sub-skills with `[name](../name/SKILL.md)` — relative from any SKILL.md.
- The `examples/` apps must typecheck against the published `remix@next`. They are the ground truth — if a SKILL.md disagrees with them, the example wins.
