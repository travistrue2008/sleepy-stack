#!/usr/bin/env bash

# Wrapper for the Bun VS Code extension (`bun.test.customScript`).
#
# The extension always runs `bun test` from the workspace root, so each
# package's `bunfig.toml` (preloads, coverage, etc.) and `.env` are never
# picked up. This script groups the test files it receives by package and runs
# `bun test` from inside each package directory instead.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# VS Code starts the extension without the user's shell, so `bun` is not on
# PATH. Run bun through mise so the version pinned in mise.toml is used.
# shellcheck source=find-mise.sh
. "$ROOT/scripts/find-mise.sh"

if MISE="$(find_mise)"; then
	bun() { "$MISE" exec -- bun "$@"; }
elif ! command -v bun >/dev/null 2>&1; then
	echo "vscode-bun-test: neither mise nor bun was found" >&2
	exit 127
fi

# the extension passes `test` as the first arg when using a custom script
if [ "${1:-}" = "test" ]; then
	shift
fi

flags=()
packages=()
file_paths=()
file_pkgs=()

for arg in "$@"; do
	path="$arg"

	if [[ "$path" != /* ]]; then
		path="$ROOT/$path"
	fi

	if [[ -f "$path" && "$path" == "$ROOT"/packages/*/* ]]; then
		rel="${path#"$ROOT"/packages/}"
		pkg="${rel%%/*}"
		seen=0

		for existing in ${packages[@]+"${packages[@]}"}; do
			if [ "$existing" = "$pkg" ]; then
				seen=1
				break
			fi
		done

		if [ "$seen" -eq 0 ]; then
			packages+=("$pkg")
		fi

		file_paths+=("$path")
		file_pkgs+=("$pkg")
	else
		flags+=("$arg")
	fi
done

if [ ${#packages[@]} -eq 0 ]; then
	# not `exec`: that would bypass the bun() function above
	bun test "$@"
	exit $?
fi

status=0

for pkg in "${packages[@]}"; do
	pkg_files=()

	for i in "${!file_paths[@]}"; do
		if [ "${file_pkgs[$i]}" = "$pkg" ]; then
			pkg_files+=("${file_paths[$i]}")
		fi
	done

	(cd "$ROOT/packages/$pkg" && bun test ${flags[@]+"${flags[@]}"} "${pkg_files[@]}") || status=$?
done

exit "$status"
