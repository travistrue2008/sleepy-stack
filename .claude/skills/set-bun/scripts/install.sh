#!/bin/sh
# install.sh <version>
# Fetch the new bun, assert it is the version asked for, and regenerate the
# lockfiles with a plain (not frozen) install. Prints SAME or MOVED per
# lockfile so unexpected movement is easy to spot. Exit 1 on any failure.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
. "$here/lib.sh"
require_version "${1-}"

# A bun the version manager provides: install it first. Never `bun upgrade`,
# which swaps the binary behind the version manager's back.
if [ -n "$(find_mise_pins)" ]; then
  command -v mise >/dev/null 2>&1 || { echo "FAIL mise is not installed"; exit 1; }
  quiet "mise install" mise install || exit 1
fi

got=$(run_bun --version 2>/dev/null || true)
if [ "$got" != "$VERSION" ]; then
  echo "FAIL resolved bun is '${got:-none}', expected $VERSION. Check how bun is provided here (PATH order, version manager activation)."
  exit 1
fi
echo "OK   bun $got is the resolved runtime"

snap() {
  find_lockfiles | while IFS= read -r f; do
    printf '%s %s\n' "$(cksum < "$f" | tr ' ' ':')" "$f"
  done
}
before=$(snap)

# Root install: with `workspaces` declared, one install covers every member.
if [ -f package.json ]; then
  quiet "bun install at ." run_bun install || exit 1
  echo "OK   bun install at ."
fi

# Standalone projects: any lockfile outside the root belongs to a directory the
# root install does not cover, so it needs its own install.
locks=$(find_lockfiles)
if [ -n "$locks" ]; then
  while IFS= read -r l; do
    d=$(dirname "$l")
    [ "$d" = . ] && continue
    ( cd "$d" && quiet "bun install in $d" run_bun install ) || exit 1
    echo "OK   bun install in $d"
  done <<EOT
$locks
EOT
fi

after=$(snap)
if [ -n "$after" ]; then
  while IFS= read -r l; do
    if printf '%s\n' "$before" | grep -Fxq -- "$l"; then
      printf 'SAME  %s\n' "${l#* }"
    else
      printf 'MOVED %s\n' "${l#* }"
    fi
  done <<EOT
$after
EOT
fi
