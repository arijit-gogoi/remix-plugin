#!/usr/bin/env bun
// check-upstream.ts — compare the cached remix version against npm's `next` tag.
// Exits 0 if up-to-date, 1 if drift detected. Suggests next steps.
//
// Usage:
//   bun run scripts/check-upstream.ts

import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const ROOT  = path.resolve(import.meta.dir, '..')
const CACHE = path.join(ROOT, '.verify-cache', 'node_modules', 'remix', 'package.json')

const c = {
  red:   (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  cyan:  (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim:   (s: string) => `\x1b[2m${s}\x1b[0m`,
}

async function getCached(): Promise<string | null> {
  try {
    const pkg = JSON.parse(await fs.readFile(CACHE, 'utf8'))
    return pkg.version ?? null
  } catch {
    return null
  }
}

async function getLatest(): Promise<{ next: string; latest: string }> {
  const res = await fetch('https://registry.npmjs.org/remix')
  if (!res.ok) throw new Error(`npm registry returned ${res.status}`)
  const data = await res.json() as { 'dist-tags': Record<string, string> }
  return {
    next:   data['dist-tags']['next']   ?? '(none)',
    latest: data['dist-tags']['latest'] ?? '(none)',
  }
}

const cached = await getCached()
const tags = await getLatest()

console.log(`cached:      ${cached ?? c.dim('(none — run verify.ts --reprime)')}`)
console.log(`npm @next:   ${tags.next}`)
console.log(`npm @latest: ${tags.latest}`)
console.log()

if (tags.latest && !tags.latest.startsWith('2.')) {
  console.log(c.cyan('→ Remix v3 has shipped a stable release.'))
  console.log(c.dim('  Time to bump examples/*/package.json from "next" to "^3.0.0" and tag v1.0.0 of this plugin.'))
  process.exit(1)
}

if (cached !== tags.next) {
  console.log(c.red('drift detected'))
  console.log(c.dim(`  bun run scripts/verify.ts --reprime    # rebuild cache against ${tags.next}`))
  console.log(c.dim(`  bun run scripts/verify.ts              # run the harness`))
  console.log(c.dim(`  ...then patch any drift, bump version, tag, push, bump marketplace ref`))
  process.exit(1)
}

console.log(c.green('up to date'))
