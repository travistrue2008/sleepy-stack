#!/bin/sh
# discover.sh
# Read-only. List every place the repo pins bun, grouped by kind, plus the bun
# lockfiles. Exit 0 if at least one pin site exists, 1 if none (nothing to do).
set -eu
here=$(cd "$(dirname "$0")" && pwd)
. "$here/lib.sh"

count() {
  if [ -z "$1" ]; then echo 0; else printf '%s\n' "$1" | wc -l | tr -d ' '; fi
}
show() {
  printf '== %s\n' "$1"
  if [ -n "$2" ]; then printf '%s\n' "$2"; else echo '(none)'; fi
}

mise=$(find_mise_pins)
types=$(find_types)
pm=$(find_pm)
docker=$(find_docker)
ci=$(find_ci)
locks=$(find_lockfiles)

show 'version manager pin (mise.toml, .mise.toml, .tool-versions)' "$mise"
show '@types/bun devDependency' "$types"
show 'packageManager field naming bun' "$pm"
show 'oven/bun image reference (Dockerfile, compose)' "$docker"
show 'setup-bun bun-version input (.github)' "$ci"
show 'bun lockfiles' "$locks"

printf 'SUMMARY mise=%s types=%s package-manager=%s docker=%s ci=%s lockfiles=%s\n' \
  "$(count "$mise")" "$(count "$types")" "$(count "$pm")" \
  "$(count "$docker")" "$(count "$ci")" "$(count "$locks")"

if [ -z "$mise$types$pm$docker$ci" ]; then
  echo 'NONE no bun pin sites found; nothing to do'
  exit 1
fi
