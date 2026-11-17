#!/bin/sh
# apply.sh <version> [--dry-run]
# Move every rewritable pin to <version>. Runs preflight.sh first and aborts
# with nothing modified if any probe fails. Handles: version manager pins,
# @types/bun, an existing bun packageManager field, oven/bun image tags, and an
# exact setup-bun bun-version. Pins it cannot rewrite safely are reported as
# LEFT (digest-pinned or variable image tags, floating CI versions, formats it
# does not recognize); those are for a human to decide.
# With --dry-run, print the EDIT lines without writing anything.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
. "$here/lib.sh"
require_version "${1-}"
dry=0
[ "${2-}" = "--dry-run" ] && dry=1

if ! "$here/preflight.sh" "$VERSION"; then
  echo "ABORT preflight failed; nothing modified" >&2
  exit 1
fi

tmpdir=$(mktemp -d "${TMPDIR:-/tmp}/set-bun.XXXXXX")
trap 'rm -rf "$tmpdir"' EXIT INT TERM
next_tmp() { mktemp "$tmpdir/f.XXXXXX"; }

# finish <file> <tmp> <pattern>: write <tmp> over <file> when it differs, then
# report any <pattern> line in the result that still does not name $VERSION.
finish() {
  _f=$1; _t=$2; _pat=$3
  if ! cmp -s "$_f" "$_t"; then
    printf 'EDIT %s%s\n' "$_f" "$([ "$dry" = 1 ] && echo ' (dry run)')"
    diff "$_f" "$_t" | sed -n -e 's/^< /  - /p' -e 's/^> /  + /p'
    [ "$dry" = 1 ] || cat "$_t" > "$_f"
  fi
  if [ -n "$_pat" ]; then
    grep -nE -e "$_pat" "$_t" | while IFS= read -r _l; do
      printf '%s\n' "$_l" | has_version "$VERSION" ||
        printf 'LEFT %s:%s  (not an exact pin; review by hand)\n' "$_f" "$_l"
    done
  fi
}

# Each block builds its file list first and loops with a here-document so the
# loop runs in this shell, not a pipeline subshell.

# 1. Version manager pins.
list=$(find_mise_pins | distinct_files)
if [ -n "$list" ]; then
  while IFS= read -r f; do
    t=$(next_tmp)
    case $f in
      *.tool-versions)
        sed -E "s|^(bun[[:space:]]+)[^[:space:]#]+|\\1$VERSION|" "$f" > "$t"
        finish "$f" "$t" '^bun[[:space:]]+[^[:space:]=]' ;;
      *)
        sed -E \
          -e "/^[[:space:]]*bun[[:space:]]*=[[:space:]]*\\{/ s|(version[[:space:]]*=[[:space:]]*)\"[^\"]*\"|\\1\"$VERSION\"|" \
          -e "/^[[:space:]]*bun[[:space:]]*=[[:space:]]*\"/ s|(=[[:space:]]*)\"[^\"]*\"|\\1\"$VERSION\"|" \
          "$f" > "$t"
        finish "$f" "$t" '^[[:space:]]*bun[[:space:]]*=' ;;
    esac
  done <<EOT
$list
EOT
fi

# 2. @types/bun (only where the key already exists; never added).
list=$(find_types | distinct_files)
if [ -n "$list" ]; then
  while IFS= read -r f; do
    t=$(next_tmp)
    sed -E "s|(\"@types/bun\"[[:space:]]*:[[:space:]]*)\"[^\"]*\"|\\1\"$VERSION\"|" "$f" > "$t"
    finish "$f" "$t" '"@types/bun"[[:space:]]*:'
  done <<EOT
$list
EOT
fi

# 3. packageManager (only where it already names bun; never added).
list=$(find_pm | distinct_files)
if [ -n "$list" ]; then
  while IFS= read -r f; do
    t=$(next_tmp)
    sed -E "s|(\"packageManager\"[[:space:]]*:[[:space:]]*)\"bun@[^\"]*\"|\\1\"bun@$VERSION\"|" "$f" > "$t"
    finish "$f" "$t" '"packageManager"[[:space:]]*:[[:space:]]*"bun@'
  done <<EOT
$list
EOT
fi

# 4. Docker image tags (see retag.awk for the variant and LEFT rules).
list=$(find_docker | distinct_files)
if [ -n "$list" ]; then
  while IFS= read -r f; do
    t=$(next_tmp)
    notes=$(next_tmp)
    awk -v V="$VERSION" -v MODE=rewrite -f "$here/retag.awk" "$f" > "$t" 2> "$notes"
    finish "$f" "$t" ''
    cat "$notes"
  done <<EOT
$list
EOT
fi

# 5. CI: an exact setup-bun bun-version. latest, ranges and expressions stay.
list=$(find_ci | distinct_files)
if [ -n "$list" ]; then
  while IFS= read -r f; do
    t=$(next_tmp)
    sed -E "s|(bun-version[[:space:]]*:[[:space:]]*[\"$SQ]?)[0-9]+\\.[0-9]+\\.[0-9]+|\\1$VERSION|" "$f" > "$t"
    finish "$f" "$t" 'bun-version[[:space:]]*:'
  done <<EOT
$list
EOT
fi

if [ "$dry" = 1 ]; then echo "DONE dry run, nothing written"; else echo "DONE"; fi
