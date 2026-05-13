# remix

A Claude Code plugin that turns the agent into a Remix v3 expert. Bundled as a plugin with 14 progressive-disclosure sub-skills covering every layer of the framework: routing, controllers, data, auth, middleware, UI, testing, and scaffolding.

## What this is

Remix v3 is a standalone full-stack TypeScript framework. The `remix` meta-package re-exports everything via subpath imports — `remix/fetch-router`, `remix/data-table`, `remix/auth`, `remix/ui`, and so on. This plugin loads automatically when Claude sees a Remix v3 project, and can be invoked manually with `/remix`.

## Install

Add this repo to a Claude Code marketplace, or symlink/copy it into `~/.claude/plugins/`:

```pwsh
# Quick local install (PowerShell)
New-Item -ItemType SymbolicLink -Path "$HOME\.claude\plugins\remix" -Target "$PWD"
```

## Layout

```
remix/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── routing/           — route(), form(), resources(), patterns, params
│   ├── controllers/       — Controller<...> type, actions, context, get(), redirect()
│   ├── data-table/        — tables, columns, queries, adapters, transactions
│   ├── data-schema/       — s.parse, f.object, validation checks, error handling
│   ├── auth/              — credentials, OAuth (Google/GitHub), session auth scheme
│   ├── sessions/          — Session, createCookieSessionStorage, session middleware
│   ├── cookies/           — createCookie, signing, parse, serialize
│   ├── middleware/        — logger, compression, static, methodOverride, asyncContext
│   ├── forms-uploads/     — parseFormData, uploadHandler, multipart
│   ├── file-storage/      — fs, memory, s3 backends; set/get/remove
│   ├── ui-framework/      — JSX runtime, components without hooks, renderToStream
│   ├── testing/           — remix/test, assertions, mocks, e2e with Playwright
│   ├── scaffolding/       — npx remix new, remix doctor, remix routes
│   └── migrations/        — createMigration, schema DDL, migration runner
├── scripts/               — Bun-powered scaffolders (create-route, add-controller, …)
├── examples/
│   ├── minimal/           — server.ts + routes.ts + controller — smallest viable app
│   └── bookstore-mini/    — adapted slice of the official bookstore demo
└── assets/                — boilerplate templates copied by scripts
```

## How discovery works

The top-level `skills/` directory contains one SKILL.md per topic. Each `description` field tells Claude precisely when to load that sub-skill, and each SKILL.md links into its own `references/*.md` for deeper APIs. Progressive disclosure — only what's needed lands in the context window.

## Examples

- `examples/minimal/` — the absolute minimum Remix v3 app: server, router, one route.
- `examples/bookstore-mini/` — a slice of the official `remix-run/remix/demos/bookstore`, showing controllers, data-table, sessions, and the render pipeline together.

The full official demos live at `remix-run/remix/demos/bookstore` and `remix-run/remix/demos/social-auth`. This plugin links to them rather than duplicating them.

## Conventions

- All imports use the `remix/<subpath>` form — never `@remix-run/<pkg>`.
- All examples use Node ≥ 24.3.0 and `tsx` for the dev loop, matching the official bootstrap template.
- Scaffolding scripts are written for Bun (`bun run scripts/<name>.ts`).
