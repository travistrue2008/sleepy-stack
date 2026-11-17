#!/bin/sh
# preflight.sh <version>
# Read-only. Confirm the version exists in every registry the repo actually
# depends on, before anything is edited. A probe runs only when its pin site
# exists. Exit 0 if all probes pass, 1 if any fail.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
. "$here/lib.sh"
require_version "${1-}"

fail=0
ok()   { printf 'OK   %s\n' "$*"; }
skip() { printf 'SKIP %s\n' "$*"; }
bad()  { printf 'FAIL %s\n' "$*"; fail=1; }

http_code() {
  if command -v curl >/dev/null 2>&1; then
    curl -s -m 20 -o /dev/null -w '%{http_code}' "$1" 2>/dev/null || true
  else
    echo "nocurl"
  fi
}

# Version manager: the version must be installable.
if [ -n "$(find_mise_pins)" ]; then
  if command -v mise >/dev/null 2>&1; then
    if listing=$(mise ls-remote bun 2>/dev/null); then
      if printf '%s\n' "$listing" | grep -Fxq "$VERSION"; then
        ok "mise: bun $VERSION is installable"
      else
        bad "mise: bun $VERSION is not in 'mise ls-remote bun'"
      fi
    else
      why=$(mise ls-remote bun 2>&1 >/dev/null | head -2 | tr '\n' ' ')
      bad "mise: 'mise ls-remote bun' failed: $why(untrusted config? try 'mise trust')"
    fi
  else
    bad "mise: a version manager pin exists but mise is not installed"
  fi
else
  skip "mise: no version manager pin in this repo"
fi

# npm: @types/bun is published in lockstep with bun.
if [ -n "$(find_types)" ]; then
  code=$(http_code "https://registry.npmjs.org/@types/bun/$VERSION")
  if [ "$code" = 200 ]; then ok "npm: @types/bun@$VERSION exists"
  else bad "npm: @types/bun@$VERSION returned '$code' (expected 200)"; fi
else
  skip "npm: no @types/bun in this repo"
fi

# Docker Hub: every distinct new tag must exist.
docker_files=$(find_docker | distinct_files)
if [ -n "$docker_files" ]; then
  tags=$(printf '%s\n' "$docker_files" | while IFS= read -r f; do
    awk -v V="$VERSION" -v MODE=list -f "$here/retag.awk" "$f"
  done | sort -u)
  if [ -z "$tags" ]; then
    skip "docker: no rewritable oven/bun tag (all digest-pinned, variable or untagged)"
  else
    for t in $tags; do
      code=$(http_code "https://hub.docker.com/v2/repositories/oven/bun/tags/$t")
      if [ "$code" = 200 ]; then ok "docker: oven/bun:$t exists"
      else bad "docker: oven/bun:$t returned '$code' (expected 200)"; fi
    done
  fi
else
  skip "docker: no oven/bun image in this repo"
fi

exit "$fail"
