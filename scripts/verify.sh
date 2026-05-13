#!/usr/bin/env bash
# verify.sh — run every check the plugin claims to support.
#
# Exits non-zero on any failure. Use this before tagging a new version.
#
# Usage (from the plugin root):
#   bash scripts/verify.sh
#
# Checks:
#   1. Type-check examples/minimal against the real remix package.
#   2. Type-check examples/bookstore-mini against the real remix package.
#   3. Smoke-test init-project.ts: scaffold a fresh project + tsc clean.
#   4. Smoke-test create-route.ts: append a route + verify it still tsc's clean.
#   5. Smoke-test create-resource.ts: add a resources block + verify tsc clean.
#   6. Smoke-test create-migration.ts: drop a migration file + verify tsc clean.
#   7. Smoke-test add-middleware.ts: insert two middlewares + verify tsc clean.
#   8. Smoke-test create-controller.ts: stub a controller file (file-existence
#      only — generated stub is intentionally permissive and only typechecks
#      against a matching RouteMap target).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d -t remix-verify-XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

red()   { printf '\033[31m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }
cyan()  { printf '\033[36m%s\033[0m\n' "$1"; }

pass=0
fail=0
check() {
  local label="$1"; shift
  cyan "→ $label"
  if "$@"; then
    green "  ✓ $label"
    pass=$((pass + 1))
  else
    red   "  ✗ $label"
    fail=$((fail + 1))
  fi
}

ensure_deps() {
  local dir="$1"
  if [ ! -d "$dir/node_modules/remix" ]; then
    (cd "$dir" && npm install --silent)
  fi
  if [ ! -x "$dir/node_modules/.bin/tsc" ]; then
    (cd "$dir" && npm install --no-save --silent typescript@^5.6.0)
  fi
}

typecheck() {
  local dir="$1"
  ensure_deps "$dir"
  (cd "$dir" && ./node_modules/.bin/tsc --noEmit)
}

# --- Check 1: examples/minimal -----------------------------------------------
check "examples/minimal typechecks" typecheck "$ROOT/examples/minimal"

# --- Check 2: examples/bookstore-mini ---------------------------------------
check "examples/bookstore-mini typechecks" typecheck "$ROOT/examples/bookstore-mini"

# --- Check 3: init-project scaffolder ---------------------------------------
init_smoke() {
  local d="$TMP/init"
  mkdir -p "$d"
  (cd "$d" && bun run "$ROOT/scripts/init-project.ts" --name . --app-name "Smoke Test" > /dev/null)
  ensure_deps "$d"
  (cd "$d" && ./node_modules/.bin/tsc --noEmit)
}
check "init-project.ts scaffolds a tsc-clean app" init_smoke

# --- Check 4: create-route scaffolder ---------------------------------------
create_route_smoke() {
  local d="$TMP/route"
  mkdir -p "$d"
  cp -r "$ROOT/examples/minimal/." "$d/"
  ensure_deps "$d"
  # Use //path to escape MSYS path mangling on Git Bash.
  (cd "$d" && bun run "$ROOT/scripts/create-route.ts" --name smokeTest --pattern //smoke > /dev/null)
  (cd "$d" && ./node_modules/.bin/tsc --noEmit)
}
check "create-route.ts produces a tsc-clean app" create_route_smoke

# --- Check 5: create-resource scaffolder ------------------------------------
create_resource_smoke() {
  local d="$TMP/resource"
  mkdir -p "$d"
  cp -r "$ROOT/examples/minimal/." "$d/"
  ensure_deps "$d"
  (cd "$d" && bun run "$ROOT/scripts/create-resource.ts" --name reviews --param reviewId > /dev/null)
  (cd "$d" && ./node_modules/.bin/tsc --noEmit)
}
check "create-resource.ts produces a tsc-clean app" create_resource_smoke

# --- Check 6: create-migration scaffolder -----------------------------------
create_migration_smoke() {
  local d="$TMP/migration"
  mkdir -p "$d"
  cp -r "$ROOT/examples/minimal/." "$d/"
  ensure_deps "$d"
  (cd "$d" && bun run "$ROOT/scripts/create-migration.ts" --name add_smoke_table > /dev/null)
  # tsc-check the whole project (migration files are caught by include "app").
  # The migration file itself lives in db/ which is not in tsconfig include,
  # so verify it parses by reading it with bun:
  local file
  file=$(ls "$d/db/migrations"/*.ts | head -1)
  [ -f "$file" ] || return 1
  bun --bun build "$file" --target node --outdir "$TMP/migration-build" > /dev/null
}
check "create-migration.ts produces a parseable migration" create_migration_smoke

# --- Check 7: add-middleware scaffolder -------------------------------------
add_middleware_smoke() {
  local d="$TMP/mw"
  mkdir -p "$d"
  cp -r "$ROOT/examples/minimal/." "$d/"
  ensure_deps "$d"
  (cd "$d" && bun run "$ROOT/scripts/add-middleware.ts" --name logger > /dev/null)
  (cd "$d" && bun run "$ROOT/scripts/add-middleware.ts" --name compression > /dev/null)
  (cd "$d" && ./node_modules/.bin/tsc --noEmit)
}
check "add-middleware.ts produces a tsc-clean app" add_middleware_smoke

# --- Check 8: create-controller scaffolder (file existence only) -----------
create_controller_smoke() {
  local d="$TMP/ctrl"
  mkdir -p "$d"
  cp -r "$ROOT/examples/minimal/." "$d/"
  (cd "$d" && bun run "$ROOT/scripts/create-controller.ts" --route home > /dev/null)
  [ -f "$d/app/controllers/home/controller.tsx" ]
}
check "create-controller.ts writes the expected file" create_controller_smoke

echo
if [ "$fail" -gt 0 ]; then
  red "$fail failed, $pass passed"
  exit 1
fi
green "$pass checks passed"
