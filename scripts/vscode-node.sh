#!/usr/bin/env bash

# Node wrapper for the Vitest VS Code extension (`vitest.nodeExecutable`).
#
# The extension spawns `node` without the user's shell, so a Node that is only
# provided by mise (pinned in mise.toml) is not found and no tests are listed.
# This runs whatever the extension asked for (`node <args>`) through mise.

set -euo pipefail

# shellcheck source=find-mise.sh
. "$(dirname "${BASH_SOURCE[0]}")/find-mise.sh"

if MISE="$(find_mise)"; then
	exec "$MISE" exec -- node "$@"
fi

if command -v node >/dev/null 2>&1; then
	exec node "$@"
fi

echo "vscode-node: neither mise nor node was found" >&2
exit 127
