#!/bin/sh
# verify.sh <version>
# Read-mostly checks that the pins really moved together: no stale pin, the
# toolchain resolves to <version>, the lockfiles are frozen-consistent, and any
# oven/bun image runs that version. Exit 1 if anything is off. STALE lines for
# pins deliberately left alone (digest, variable, floating CI) are expected and
# need a human judgment. The docker build and the project's own gates are not
# run here; SKILL.md covers them.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
. "$here/lib.sh"
require_version "${1-}"

status=0
ok()   { printf 'OK   %s\n' "$*"; }
skip() { printf 'SKIP %s\n' "$*"; }
bad()  { printf 'FAIL %s\n' "$*"; status=1; }

# 1. No pin site may still name another version.
check_sites() {
  _label=$1; _lines=$2
  [ -n "$_lines" ] || return 0
  while IFS= read -r _l; do
    if ! printf '%s\n' "$_l" | has_version "$VERSION"; then
      printf 'STALE %s: %s\n' "$_label" "$_l"
      status=1
    fi
  done <<EOT
$_lines
EOT
}
check_sites 'version manager' "$(find_mise_pins)"
check_sites '@types/bun' "$(find_types)"
check_sites 'packageManager' "$(find_pm)"
check_sites 'oven/bun' "$(find_docker)"
check_sites 'setup-bun' "$(find_ci)"

# 2. The toolchain moved.
got=$(run_bun --version 2>/dev/null || true)
if [ "$got" = "$VERSION" ]; then ok "bun --version is $got"
else bad "bun --version is '${got:-none}', expected $VERSION"; fi

# 3. Lockfiles are consistent with the manifests.
if [ -f package.json ]; then
  if quiet "frozen install at ." run_bun install --frozen-lockfile; then ok "frozen install at ."
  else status=1; fi
fi
locks=$(find_lockfiles)
if [ -n "$locks" ]; then
  while IFS= read -r l; do
    d=$(dirname "$l")
    [ "$d" = . ] && continue
    if ( cd "$d" && quiet "frozen install in $d" run_bun install --frozen-lockfile ); then
      ok "frozen install in $d"
    else
      status=1
    fi
  done <<EOT
$locks
EOT
fi

# 4. Every image at the target version runs that bun.
tags=$(find_docker | grep -v 'oven/bun:[^[:space:]]*@' |
  sed -nE "s|.*oven/bun:([^[:space:]\"$SQ\$]+).*|\\1|p" | sort -u)
if [ -z "$tags" ]; then
  skip "docker: no oven/bun image to run"
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  for t in $tags; do
    case $t in "$VERSION"|"$VERSION"-*) ;; *) continue ;; esac
    out=$(docker run --rm "oven/bun:$t" bun --version 2>/dev/null || true)
    if [ "$out" = "$VERSION" ]; then ok "docker: oven/bun:$t runs bun $out"
    else bad "docker: oven/bun:$t reports '${out:-nothing}', expected $VERSION"; fi
  done
else
  skip "docker: daemon not available, images not run"
fi

exit "$status"
