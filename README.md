# remix

![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-Plugin-7c3aed)
![Remix v3](https://img.shields.io/badge/Remix-v3-000000)
![License](https://img.shields.io/badge/license-MIT-blue)

A Claude Code plugin that turns the agent into a **Remix v3 expert**. 14 progressive-disclosure sub-skills covering every layer of the framework — routing, controllers, data, auth, middleware, UI, testing, and scaffolding — plus two runnable example apps and a set of Bun-powered scaffolders.

## Why this exists

Remix v3 is a *standalone* full-stack TypeScript framework — its own router, data layer, validation, auth, UI runtime, and test framework. The shape of an app is unlike Remix v2 or any React framework. Without prior context, an LLM coding agent will reach for v2 patterns or invent APIs. This plugin gives Claude the right map of v3 the moment it sees one.

## Install

This plugin is published through the [`ari-marketplace`](https://github.com/arijit-gogoi/ari-marketplace) marketplace.

```text
/plugin marketplace add arijit-gogoi/ari-marketplace
/plugin install remix@ari-marketplace
```

After install, restart Claude Code. The plugin auto-loads on Remix v3 projects (anything with `app/routes.ts`, `app/router.ts`, or a `remix` dep in `package.json`) and on the `/remix` command.

### Development install

If you want to hack on the plugin itself, clone the repo and follow the layout in `~/.claude/plugins/` that your Claude Code version expects — inspect an existing entry there to match the convention.

```pwsh
git clone https://github.com/arijit-gogoi/remix-plugin.git
```

## What you get

| Topic | What it covers |
|-------|----------------|
| **routing** | `route()`, `form()`, `resources()`, verb helpers, params, wildcards |
| **controllers** | `Controller<typeof routes.X>`, actions, context, `get(Key)` |
| **database** | tables, columns, queries, joins, transactions, adapters (SQLite/Postgres/MySQL) |
| **validation** | `s.parse` / `parseSafe`, `f.object`, validation checks, coercion — use this instead of installing Zod |
| **auth** | credentials, Google/GitHub/Microsoft/Okta/Auth0 OAuth, `requireAuth` |
| **sessions** | `Session`, storage backends (cookie/memory/fs/redis/memcache), flash |
| **cookies** | `createCookie`, signing, secret rotation playbook |
| **security** | CSRF (`csrf()`), Cross-Origin Protection (`cop()`), CORS (`cors()`) |
| **middlewares** | reference card for every shipped middleware, canonical ordering |
| **forms** | `parseFormData`, `uploadHandler`, multipart internals, limits |
| **file-storage** | fs / memory / S3 backends |
| **ui** | JSX runtime, setup-then-render model, `renderToStream`, hydration |
| **templating** | `html\`...\`` safe-HTML template tag — for responses without JSX |
| **headers** | typed parsers for Accept, CacheControl, Cookie, Range, etc. |
| **build** | `createAssetServer` — on-demand JS/TS/CSS compilation (replaces Vite) |
| **utilities** | reference card for mime, lazy-file, fs, tar-parser, terminal, node-serve, fetch-proxy |
| **testing** | `remix/test`, `router.fetch`, mocks, e2e with Playwright |
| **cli** | official `remix` CLI: `new` / `doctor` / `routes` / `test` / `version` / `completion` |
| **scaffolders** | this plugin's Bun scripts: `create-route`, `create-resource`, `create-migration`, `add-middleware`, etc. |
| **migrations** | `createMigration`, DDL helpers, runner, zero-downtime strategies |
| **principles** | the six principles guiding Remix v3 — Model-First, Web APIs, Runtime, Dependencies, Composition, Cohesion |

Each sub-skill is a SKILL.md plus 2–4 progressive-disclosure references docs. Claude loads only what the current task needs.

## Example apps

- [`examples/minimal/`](./examples/minimal) — smallest viable Remix v3 app (5 files).
- [`examples/bookstore-mini/`](./examples/bookstore-mini) — focused slice of the official bookstore demo: routes, middleware stack, SQLite data-table, session-backed cart, admin CRUD with form validation.

```pwsh
cd examples/bookstore-mini
npm install
npm run dev     # http://localhost:3000
```

## Bun scaffolders

```pwsh
bun run scripts/init-project.ts     --name my-app
bun run scripts/create-route.ts     --name about --pattern /about
bun run scripts/create-resource.ts  --name reviews --param reviewId
bun run scripts/create-migration.ts --name add_reviews_table
bun run scripts/add-middleware.ts   --name session
```

Each script is idempotent, refuses to overwrite, and prints exactly what it changed.

## Project layout

```
remix-plugin/
├── .claude-plugin/plugin.json
├── skills/
│   ├── remix/SKILL.md                  ← top-level entrypoint
│   └── 14 sub-skill subdirectories     ← each with SKILL.md + references/*.md
├── scripts/                             ← Bun scaffolders
└── examples/
    ├── minimal/
    └── bookstore-mini/
```

## Conventions

- All imports use the `remix/<subpath>` form — never `@remix-run/<pkg>`.
- All examples use Node ≥ 24.3.0 and `tsx` for the dev loop, matching the official bootstrap template.
- Scaffolding scripts run under Bun (or Node ≥ 22.6 with `--experimental-strip-types`).

## A note on accuracy

Reference snippets and example code describe the framework's public surface. Before relying on any specific snippet, verify against the installed package version — reading the `remix/<subpath>` types is the fastest confirmation. If you spot a divergence between this plugin and the installed framework, the framework wins. [Open an issue](https://github.com/arijit-gogoi/remix-plugin/issues) or send a patch.

## Contributing

Issues and PRs welcome. Useful contributions:

- Corrections to API signatures that have drifted since this plugin was written
- New reference docs for topics that emerge after stable release
- Additional example apps showcasing patterns this plugin doesn't yet cover

## License

MIT — see [LICENSE](./LICENSE).
