// Shared helpers for the scaffolding scripts. No external dependencies.
// Run under Bun, or under Node ≥ 22.6.0 with `--experimental-strip-types`.

import * as fs from 'node:fs'
import * as path from 'node:path'

export type Args = Record<string, string | boolean>

export function parseArgs(argv: string[]): Args {
  const args: Args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) {
      args[key] = true
    } else {
      args[key] = next
      i++
    }
  }
  return args
}

export function require_(args: Args, name: string): string {
  const v = args[name]
  if (typeof v !== 'string' || v.length === 0) {
    die(`missing required --${name}`)
  }
  return v
}

export function die(msg: string): never {
  console.error(`\x1b[31merror\x1b[0m ${msg}`)
  process.exit(2)
}

export function info(msg: string) {
  console.log(`\x1b[2m·\x1b[0m ${msg}`)
}

export function created(file: string) {
  console.log(`\x1b[32mcreated\x1b[0m ${path.relative(process.cwd(), file)}`)
}

export function edited(file: string) {
  console.log(`\x1b[36medited\x1b[0m  ${path.relative(process.cwd(), file)}`)
}

export function writeFileSafe(file: string, content: string) {
  if (fs.existsSync(file)) die(`refusing to overwrite ${file}`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
  created(file)
}

export function readFile(file: string): string {
  if (!fs.existsSync(file)) die(`expected file does not exist: ${file}`)
  return fs.readFileSync(file, 'utf8')
}

export function writeFile(file: string, content: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
  edited(file)
}

export function pascalCase(name: string): string {
  return name
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('')
}

export function timestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  )
}
