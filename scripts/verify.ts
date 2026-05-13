#!/usr/bin/env bun
// verify.ts — parallel, install-once verification harness.
//
// Strategy:
//   1. Prime ONE node_modules in .verify-cache/ (npm install + tsc install).
//   2. For each check, copy the source into a scratch dir and symlink
//      .verify-cache/node_modules into it.
//   3. Run all 8 checks in parallel via Promise.all.
//   4. Fail fast — exit non-zero on any failure.
//
// Usage:
//   bun run scripts/verify.ts          # run all checks
//   bun run scripts/verify.ts --keep   # don't delete the scratch dir
//   bun run scripts/verify.ts --reprime # delete the cache and re-prime

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT      = path.resolve(import.meta.dir, '..')
const CACHE     = path.join(ROOT, '.verify-cache')
const PRIMED_NM = path.join(CACHE, 'node_modules')
const SCRATCH   = path.join(CACHE, 'scratch')

const keep    = process.argv.includes('--keep')
const reprime = process.argv.includes('--reprime')

const c = {
  red:   (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  cyan:  (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim:   (s: string) => `\x1b[2m${s}\x1b[0m`,
}

// ── shell helpers ──────────────────────────────────────────────────────────

type RunOptions = { cwd?: string; env?: Record<string, string> }

function run(cmd: string, args: string[], opts: RunOptions = {}): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, {
      cwd: opts.cwd ?? process.cwd(),
      env: { ...process.env, ...opts.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    })
    let stdout = '', stderr = ''
    p.stdout?.on('data', (b) => { stdout += String(b) })
    p.stderr?.on('data', (b) => { stderr += String(b) })
    p.on('close', (code) => resolve({ stdout, stderr, code: code ?? 1 }))
  })
}

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true } catch { return false }
}

// Recursive copy. Bun has fs.cp(); Node ≥16.7 has fs.cp via fs/promises.
async function cp(src: string, dst: string) {
  await fs.cp(src, dst, { recursive: true })
}

async function symlink(target: string, linkPath: string) {
  // Use junction on Windows for directories (doesn't need elevated perms).
  const type = process.platform === 'win32' ? 'junction' : 'dir'
  await fs.symlink(target, linkPath, type)
}

// ── prime the shared node_modules ──────────────────────────────────────────

async function prime() {
  if (reprime && await exists(CACHE)) {
    console.log(c.dim(`· clearing ${path.relative(ROOT, CACHE)}`))
    await fs.rm(CACHE, { recursive: true, force: true })
  }
  if (await exists(PRIMED_NM)) {
    console.log(c.dim(`· using cached node_modules at ${path.relative(ROOT, PRIMED_NM)}`))
    return
  }

  console.log(c.cyan(`→ priming shared node_modules (one-time, ~30-60s)`))
  await fs.mkdir(CACHE, { recursive: true })
  // Use the minimal example's package.json as the source of truth.
  const srcPkg = await fs.readFile(path.join(ROOT, 'examples/minimal/package.json'), 'utf8')
  await fs.writeFile(path.join(CACHE, 'package.json'), srcPkg)

  const tsconfigSrc = await fs.readFile(path.join(ROOT, 'examples/minimal/tsconfig.json'), 'utf8')
  await fs.writeFile(path.join(CACHE, 'tsconfig.json'), tsconfigSrc)

  const npmInstall = await run('npm', ['install', '--silent', '--no-audit', '--no-fund'], { cwd: CACHE })
  if (npmInstall.code !== 0) {
    console.error(c.red(`npm install failed (exit ${npmInstall.code}):\n${npmInstall.stdout}\n${npmInstall.stderr}`))
    process.exit(1)
  }
  // tsc is needed as a peer for the typecheck. Add it after the base install.
  const tscInstall = await run('npm', ['install', '--no-save', '--silent', 'typescript@^5.6.0'], { cwd: CACHE })
  if (tscInstall.code !== 0) {
    console.error(c.red(`tsc install failed (exit ${tscInstall.code}):\n${tscInstall.stdout}\n${tscInstall.stderr}`))
    process.exit(1)
  }
  // Sanity check: is tsc actually in the .bin?
  const tscBin = path.join(PRIMED_NM, '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc')
  if (!await exists(tscBin)) {
    console.error(c.red(`tsc not found at ${tscBin} after install`))
    process.exit(1)
  }
}

// ── per-check scratch setup ────────────────────────────────────────────────

async function freshScratch(name: string, sourceDir: string | null): Promise<string> {
  const dir = path.join(SCRATCH, name)
  if (await exists(dir)) await fs.rm(dir, { recursive: true, force: true })
  await fs.mkdir(dir, { recursive: true })

  if (sourceDir) {
    // Copy everything EXCEPT node_modules and package-lock.json.
    const entries = await fs.readdir(sourceDir, { withFileTypes: true })
    for (const ent of entries) {
      if (ent.name === 'node_modules' || ent.name === 'package-lock.json') continue
      await cp(path.join(sourceDir, ent.name), path.join(dir, ent.name))
    }
  }

  // Symlink the primed node_modules.
  await symlink(PRIMED_NM, path.join(dir, 'node_modules'))
  return dir
}

async function tsc(dir: string): Promise<{ ok: boolean; output: string }> {
  const tscBin = path.join(dir, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc')
  const r = await run(tscBin, ['--noEmit'], { cwd: dir })
  return { ok: r.code === 0, output: r.stdout + r.stderr }
}

async function bunScript(scriptPath: string, args: string[], cwd: string): Promise<{ ok: boolean; output: string }> {
  const r = await run('bun', ['run', scriptPath, ...args], { cwd })
  return { ok: r.code === 0, output: r.stdout + r.stderr }
}

// ── checks ────────────────────────────────────────────────────────────────

type Check = { name: string; run: () => Promise<{ ok: boolean; output: string }> }

const checks: Check[] = [
  {
    name: 'examples/minimal typechecks',
    run: async () => {
      const dir = await freshScratch('minimal', path.join(ROOT, 'examples/minimal'))
      return tsc(dir)
    },
  },
  {
    name: 'examples/bookstore-mini typechecks',
    run: async () => {
      const dir = await freshScratch('bookstore-mini', path.join(ROOT, 'examples/bookstore-mini'))
      return tsc(dir)
    },
  },
  {
    name: 'init-project.ts scaffolds a tsc-clean app',
    run: async () => {
      const dir = await freshScratch('init', null)
      const r = await bunScript(path.join(ROOT, 'scripts/init-project.ts'), ['--name', '.', '--app-name', 'Smoke Test'], dir)
      if (!r.ok) return r
      return tsc(dir)
    },
  },
  {
    name: 'create-route.ts produces a tsc-clean app',
    run: async () => {
      const dir = await freshScratch('route', path.join(ROOT, 'examples/minimal'))
      // Use //path to escape MSYS path mangling on Git Bash.
      const r = await bunScript(path.join(ROOT, 'scripts/create-route.ts'), ['--name', 'smokeTest', '--pattern', '//smoke'], dir)
      if (!r.ok) return r
      return tsc(dir)
    },
  },
  {
    name: 'create-resource.ts produces a tsc-clean app',
    run: async () => {
      const dir = await freshScratch('resource', path.join(ROOT, 'examples/minimal'))
      const r = await bunScript(path.join(ROOT, 'scripts/create-resource.ts'), ['--name', 'reviews', '--param', 'reviewId'], dir)
      if (!r.ok) return r
      return tsc(dir)
    },
  },
  {
    name: 'create-migration.ts produces a parseable migration',
    run: async () => {
      const dir = await freshScratch('migration', path.join(ROOT, 'examples/minimal'))
      const r = await bunScript(path.join(ROOT, 'scripts/create-migration.ts'), ['--name', 'add_smoke_table'], dir)
      if (!r.ok) return r
      // Find the generated file.
      const dbDir = path.join(dir, 'db', 'migrations')
      const files = (await fs.readdir(dbDir)).filter((f) => f.endsWith('.ts'))
      if (files.length === 0) return { ok: false, output: 'no migration file produced' }
      // Parseability check: bun build it (no output written).
      const built = await run('bun', ['build', path.join(dbDir, files[0]), '--target', 'node', '--outdir', path.join(dir, '.build')], { cwd: dir })
      return { ok: built.code === 0, output: built.stdout + built.stderr }
    },
  },
  {
    name: 'add-middleware.ts produces a tsc-clean app',
    run: async () => {
      const dir = await freshScratch('mw', path.join(ROOT, 'examples/minimal'))
      let r = await bunScript(path.join(ROOT, 'scripts/add-middleware.ts'), ['--name', 'logger'], dir)
      if (!r.ok) return r
      r = await bunScript(path.join(ROOT, 'scripts/add-middleware.ts'), ['--name', 'compression'], dir)
      if (!r.ok) return r
      return tsc(dir)
    },
  },
  {
    name: 'create-controller.ts writes the expected file',
    run: async () => {
      const dir = await freshScratch('ctrl', path.join(ROOT, 'examples/minimal'))
      const r = await bunScript(path.join(ROOT, 'scripts/create-controller.ts'), ['--route', 'home'], dir)
      if (!r.ok) return r
      const expected = path.join(dir, 'app', 'controllers', 'home', 'controller.tsx')
      const present = await exists(expected)
      return { ok: present, output: present ? '' : `missing: ${expected}` }
    },
  },
]

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const t0 = performance.now()
  await prime()

  console.log(c.cyan(`→ running ${checks.length} checks in parallel`))
  const t1 = performance.now()

  const results = await Promise.all(
    checks.map(async (check) => {
      const start = performance.now()
      try {
        const r = await check.run()
        const ms = Math.round(performance.now() - start)
        return { name: check.name, ok: r.ok, output: r.output, ms }
      } catch (err) {
        const ms = Math.round(performance.now() - start)
        return { name: check.name, ok: false, output: String(err), ms }
      }
    }),
  )

  const elapsed = Math.round(performance.now() - t0)
  const parallel = Math.round(performance.now() - t1)

  console.log()
  let pass = 0, fail = 0
  for (const r of results) {
    if (r.ok) {
      console.log(`${c.green('✓')} ${r.name} ${c.dim(`(${r.ms}ms)`)}`)
      pass++
    } else {
      console.log(`${c.red('✗')} ${r.name} ${c.dim(`(${r.ms}ms)`)}`)
      console.log(c.dim(r.output.split('\n').slice(0, 30).map((l) => `    ${l}`).join('\n')))
      fail++
    }
  }

  console.log()
  console.log(c.dim(`prime + setup: ${elapsed - parallel}ms · parallel run: ${parallel}ms · total: ${elapsed}ms`))

  if (!keep && fail === 0) {
    await fs.rm(SCRATCH, { recursive: true, force: true }).catch(() => {})
  } else if (fail > 0) {
    console.log(c.dim(`scratch dirs kept at: ${SCRATCH}`))
  }

  if (fail > 0) {
    console.log(c.red(`${fail} failed, ${pass} passed`))
    process.exit(1)
  }
  console.log(c.green(`${pass} checks passed`))
}

main().catch((err) => {
  console.error(c.red('fatal:'), err)
  process.exit(1)
})
