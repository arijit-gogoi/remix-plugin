---
name: remix-principles
description: The six principles guiding Remix v3 development from remix.run/blog/wake-up-remix — **Model-First Development** (optimize source / docs / abstractions for LLMs), **Build on Web APIs** (Request/Response/FormData/URL everywhere, not Express's `req`/`res`), **Religiously Runtime** (no bundler-driven design, tests run without bundling), **Avoid Dependencies** (the goal is zero, wrap any survivors completely), **Demand Composition** (every package useful and documented standalone, new features start as new packages), **Distribute Cohesively** (one `remix` meta-package re-exports everything for a single learning curve). Load whenever the user is asking "why does Remix do X this way", reviewing a PR that adds a build step or a third-party dep, deciding whether a proposed feature fits, evaluating Remix against another framework's philosophy (Next.js, SvelteKit, Nuxt, Astro, Hono, Express), or weighing a design choice (own router vs Express, own validator vs Zod, JSX runtime vs React). Also load on questions like "is Remix opinionated?" or "why doesn't Remix use Vite?".
---

# Principles

The six principles guiding Remix v3 development. Source: [remix.run/blog/wake-up-remix#principles](https://remix.run/blog/wake-up-remix#principles).

These are not aspirational copy — they are load-bearing decisions you can use to predict what Remix will and won't ship, and to evaluate code that lives in a Remix v3 project. Reach for this skill when a design choice is non-obvious and you want to know which principle made the call.

## The six principles

### 1. Model-First Development

AI fundamentally shifts the human-computer interaction model for both user experience and developer workflows. Optimize the source code, documentation, tooling, and abstractions for LLMs. Additionally, develop abstractions for applications to use models in the product itself, not just as a tool to develop it.

**How this shows up in v3:** APIs that read flatly (no hidden magic), single-file route maps, controllers as plain default exports, `Controller<typeof routes.X>` for full type inference. The shape of the codebase is what an agent can hold in its head.

### 2. Build on Web APIs

Sharing abstractions across the stack greatly reduces the amount of context switching, both for humans and machines. Build on the foundation of Web APIs and JavaScript because it is the only full stack ecosystem.

**How this shows up in v3:** `Request` / `Response` / `URL` / `FormData` / `Headers` everywhere. Tests run with `router.fetch(new Request(...))`. No `req`/`res`. The same primitives work in Node, Bun, Deno, Cloudflare, and the browser.

### 3. Religiously Runtime

Designing for bundlers/compilers/typegen (and any pre-runtime static analysis) leads to poor API design that eventually pollutes the entire system. All packages must be designed with no expectation of static analysis and all tests must run without bundling. Because browsers are involved, `--import` loaders for simple transformations like TypeScript and JSX are permissible.

**How this shows up in v3:** No Vite. No webpack. No codegen step. `createAssetServer` compiles browser JS on demand. Tests run under `tsx` directly. The framework works the same whether your IDE understands the types or not.

### 4. Avoid Dependencies

Dependencies lock you into somebody else's roadmap. Choose them wisely, wrap them completely, and expect to replace most of them with our own package eventually. The goal is zero.

**How this shows up in v3:** Remix ships its own router, data layer, schema validator, session, cookies, multipart parser, mime detection, tar parser, terminal styling, UI library. Most third-party deps you'd reach for already have a `remix/<subpath>` equivalent — see the "Don't reach for these" table in [remix](../remix/SKILL.md).

### 5. Demand Composition

Abstractions should be single-purpose and replaceable. A composable abstraction is easy to add and remove from an existing program. Every package must be useful and documented independent of any other context. New features should first be attempted as a new package. If impossible, attempt to break up the existing package to make it more composable. However, tightly coupled modules that almost always change together in both directions should be moved to the same package.

**How this shows up in v3:** `@remix-run/*` packages exist standalone. Middleware is just a function. Storage backends (cookie / memory / fs / redis / memcache) share the same interface. You can rip out `remix/auth` and keep the rest.

### 6. Distribute Cohesively

Extremely composable ecosystems are difficult to learn and use. Therefore the packages will be wrapped up into a single package as dependencies and re-exported as a single toolbox (`remix`) for both distribution and documentation.

**How this shows up in v3:** One install (`npm i remix@next`). One import root (`remix/<subpath>`). One set of release notes. The meta-package is the on-ramp; the underlying composability is what you get when you scale up.

## Using these as a decision tool

When you're unsure whether to add a feature, package, or dep to a Remix v3 project, walk it through the principles:

| Question | Principle that decides |
|---|---|
| "Should we add a build step for this?" | **Religiously Runtime** — usually no |
| "Should we install `<popular npm package>`?" | **Avoid Dependencies** — check `remix/<subpath>` first |
| "Should this be a new file / new package / new sub-skill?" | **Demand Composition** — yes, if single-purpose |
| "Should we generate types / config / glue at build time?" | **Religiously Runtime** — no, design APIs that don't need it |
| "Is this API hard to read in a code review?" | **Model-First** — flatten it |
| "Are we wrapping a third-party API directly?" | **Avoid Dependencies** — wrap it completely, don't leak its surface |

## See also

- [remix](../remix/SKILL.md) — the topic table and "Don't reach for these" list are the practical fallout of these principles
- [build](../build/SKILL.md) — `createAssetServer` is the runtime-first answer to bundlers
- [testing](../testing/SKILL.md) — `router.fetch(new Request(...))` is "Build on Web APIs" applied to tests
- [validation](../validation/SKILL.md), [database](../database/SKILL.md), [auth](../auth/SKILL.md), [sessions](../sessions/SKILL.md) — all examples of "Avoid Dependencies" in action

Source: [remix.run/blog/wake-up-remix#principles](https://remix.run/blog/wake-up-remix#principles).
