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

echo
if [ "$fail" -gt 0 ]; then
  red "$fail failed, $pass passed"
  exit 1
fi
green "$pass checks passed"
