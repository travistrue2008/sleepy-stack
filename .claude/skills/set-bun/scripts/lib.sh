#!/bin/sh
# Shared helpers for the set-bun scripts. Source this file, do not run it.
# POSIX sh only (no bashisms), so it runs under dash, bash and busybox.
#
# Output convention shared by every script, one finding per line:
#   OK / FAIL / SKIP   a check passed, failed, or did not apply
#   EDIT               a file was (or, with --dry-run, would be) rewritten
#   LEFT               a pin was found but deliberately not rewritten
#   STALE              a pin that does not name the target version
#   SAME / MOVED       a lockfile did not change / changed
#   REJECT / ABORT     a hard stop; nothing was modified

# Work from the repo root so every path printed is relative and stable.
ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$ROOT"

SQ="'"

# version_problem <value>: print why <value> is not an exact X.Y.Z, or nothing.
version_problem() {
  case ${1-} in
    '')                   echo "no version given" ;;
    latest)               echo "'latest' is not an exact version" ;;
    v*)                   echo "leading 'v' prefix" ;;
    '^'*|'~'*|'<'*|'>'*|'='*) echo "range operator" ;;
    *-*|*+*)              echo "prerelease or build metadata" ;;
    *x*|*X*|*'*'*)        echo "wildcard" ;;
    *)
      if printf '%s' "$1" | grep -Eq '^[0-9]+\.[0-9]+$'; then
        echo "missing patch component"
      elif ! printf '%s' "$1" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
        echo "not in X.Y.Z form"
      fi
      ;;
  esac
}

# require_version <value>: set VERSION, or print REJECT and exit 2. Never coerces.
require_version() {
  _reason=$(version_problem "${1-}")
  if [ -n "$_reason" ]; then
    printf 'REJECT "%s": %s\n' "${1-}" "$_reason" >&2
    exit 2
  fi
  VERSION=$1
}

# has_version <version>: succeed if stdin contains exactly that version
# (so 1.4.2 does not match 11.4.2 or 1.4.22).
has_version() {
  _re=$(printf '%s' "$1" | sed 's/\./\\./g')
  grep -Eq "(^|[^0-9.])${_re}([^0-9.]|\$)"
}

# files <find-predicate...>: regular files anywhere in the repo, skipping
# node_modules and .git, e.g. `files -name package.json`.
files() {
  find . \( -name node_modules -o -name .git \) -prune -o -type f \( "$@" \) -print | sort
}

# scan <ERE>: read file names on stdin, print file:line:text for each match.
scan() {
  while IFS= read -r _f; do
    grep -nE -e "$1" "$_f" 2>/dev/null | sed "s|^|$_f:|"
  done
}

# Pin-site finders. Each prints file:line:text, or nothing.
find_mise_pins() {
  files -name mise.toml -o -name .mise.toml -o -name .tool-versions |
    scan '^[[:space:]]*bun[[:space:]]*=|^bun[[:space:]]+[^[:space:]=]'
}
find_types() {
  files -name package.json | scan '"@types/bun"[[:space:]]*:'
}
find_pm() {
  files -name package.json | scan '"packageManager"[[:space:]]*:[[:space:]]*"bun@'
}
find_docker() {
  files -name 'Dockerfile*' -o -name '*.dockerfile' -o -name '*compose*.yml' -o -name '*compose*.yaml' |
    scan 'oven/bun'
}
find_ci() {
  [ -d .github ] || return 0
  find .github -type f \( -name '*.yml' -o -name '*.yaml' \) | sort |
    scan 'bun-version[[:space:]]*:'
}
find_lockfiles() {
  files -name bun.lock -o -name bun.lockb
}

# quiet <what> <cmd...>: run a command silently. On failure print a FAIL line
# and the tail of its output, so the reason is never swallowed.
quiet() {
  _what=$1; shift
  if _out=$("$@" 2>&1); then return 0; fi
  printf 'FAIL %s failed:\n' "$_what"
  printf '%s\n' "$_out" | tail -8 | sed 's/^/     /'
  return 1
}

# distinct_files: reduce file:line:text lines on stdin to unique file names.
distinct_files() {
  cut -d: -f1 | sort -u
}

# run_bun <args...>: run bun the way the project provides it. With a mise pin
# (and mise installed) go through `mise x --` so a stray bun on PATH cannot win.
# USE_MISE is decided once, here at the repo root, so that a call made from a
# subdirectory (a standalone project) resolves bun the same way.
if [ -n "$(find_mise_pins)" ] && command -v mise >/dev/null 2>&1; then
  USE_MISE=1
else
  USE_MISE=0
fi
run_bun() {
  if [ "$USE_MISE" = 1 ]; then mise x -- bun "$@"; else bun "$@"; fi
}
