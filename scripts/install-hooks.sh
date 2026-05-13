#!/usr/bin/env bash
# install-hooks.sh — wire scripts/hooks/* into .git/hooks/
#
# Idempotent: re-running just refreshes the links.
#
# Usage (from anywhere in the repo):
#   bash scripts/install-hooks.sh

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
SRC_DIR="$REPO_ROOT/scripts/hooks"
DST_DIR="$REPO_ROOT/.git/hooks"

mkdir -p "$DST_DIR"

installed=0
for hook in "$SRC_DIR"/*; do
  [ -f "$hook" ] || continue
  name="$(basename "$hook")"
  dst="$DST_DIR/$name"

  rm -f "$dst"
  cp "$hook" "$dst"
  chmod +x "$dst"
  echo "installed: $name"
  installed=$((installed + 1))
done

echo
echo "$installed hook(s) installed at $DST_DIR"
echo "bypass any hook with --no-verify"
