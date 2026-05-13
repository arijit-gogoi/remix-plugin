# Remix CLI — full reference

The `remix` binary is bundled with the `remix` npm package. Run it with `npx remix`, `bunx remix`, or via npm scripts.

## `remix new <name>`

Scaffolds a new project in `./<name>`.

| Flag                 | Default        | Notes                                    |
|----------------------|----------------|------------------------------------------|
| `--app-name "…"`     | the dir name    | Friendly name in `package.json` and docs |

```pwsh
remix new my-app --app-name "My App"
```

## `remix doctor`

Audits the project for v3 conventions.

| Flag                  | Notes                                                |
|----------------------|------------------------------------------------------|
| `--fix`               | Apply low-risk auto-fixes (rename mis-cased files, repair simple defaults). |
| `--quiet`             | Suppress passing checks.                              |
| `--json`              | Machine-readable output.                              |

Checks include:
- `package.json` `engines.node` is ≥ 24.3.0.
- `remix` dependency is present and on a supported version.
- `app/routes.ts` exists and exports a `routes` named export.
- `app/router.ts` exists and uses `createRouter` from `remix/fetch-router`.
- Every `app/controllers/**/*.tsx` exports a default `Controller<…>`.
- Imports are consistent — either all `remix/<subpath>` or all `@remix-run/<pkg>` per file.

## `remix routes`

Print the route tree from `app/routes.ts`.

| Flag       | Effect                       |
|-----------|------------------------------|
| `--tree`   | (default) ASCII tree.        |
| `--table`  | Flat table — method + path.  |
| `--json`   | Machine-readable.            |

```pwsh
remix routes --table
# Method  Path
# GET     /
# GET     /books
# GET     /books/:slug
# POST    /cart/api/add
# …
```

Helpful in PR reviews — diff the table output to see exactly what URLs your change adds or removes.

## `remix test [glob]`

Wrapper around Node's test runner, configured to load the JSX runtime and the `remix/test` framework.

| Flag        | Effect                                            |
|------------|---------------------------------------------------|
| `--watch`   | Re-run on file change.                             |
| `--reporter spec\|tap\|junit` | Pick output format.                      |

Default discovery: `**/*.test{,.e2e}.{ts,tsx}`. Provide a glob to filter:

```pwsh
remix test "**/auth/**"
remix test --watch
```

## `remix version`

```pwsh
remix version
# remix-cli  0.2.x
# remix      0.2.x
```

## `remix completion <shell>`

Emit shell-completion script for `bash` or `zsh`:

```pwsh
remix completion bash >> ~/.bashrc
remix completion zsh  >> ~/.zshrc
```

For PowerShell — there's no native target, but you can convert the bash output to a `Register-ArgumentCompleter` block by hand.

## Exit codes

| Code | Meaning                                          |
|------|--------------------------------------------------|
| 0    | Success                                          |
| 1    | Generic failure (most commands)                  |
| 2    | `doctor` found issues that need attention         |
| 3    | `doctor` ran but `--fix` couldn't repair everything |

Useful in CI: `remix doctor` and `remix test` both fail non-zero on problems.
