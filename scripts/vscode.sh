#!/usr/bin/env bash

# Brings up the local dev environment when the project is opened in VS Code
# (run by the `folderOpen` task in .vscode/tasks.json):
#
#   1. starts Docker if it is not already running
#   2. starts the compose stack and waits until its services are healthy
#
# Restore Terminals is not triggered from here: the extension has no CLI or URI
# entry point, only the VS Code command `restore-terminals.restoreTerminals`.
# .vscode/tasks.json runs that command right after this script succeeds, and
# .vscode/restore-terminals.json sets `runOnStartup` to false so the terminals
# are not restored before the database is up.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# VS Code launched from the desktop often has a minimal PATH without the Docker CLI.
export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin:$HOME/.docker/bin"

# seconds to wait for the Docker daemon to come up
TIMEOUT="${DOCKER_START_TIMEOUT:-120}"

log() { echo "vscode.sh: $*"; }
die() { echo "vscode.sh: $*" >&2; exit 1; }

docker_ready() { docker info >/dev/null 2>&1; }

start_docker() {
	case "$(uname -s)" in
		Darwin)
			open -a Docker
			;;
		Linux)
			# non-interactive sudo: a task terminal cannot answer a password prompt
			sudo -n systemctl start docker 2>/dev/null ||
				die "could not start Docker; run 'sudo systemctl start docker' and reopen the project"
			;;
		*)
			die "starting Docker is not supported on $(uname -s)"
			;;
	esac
}

command -v docker >/dev/null 2>&1 || die "the docker CLI was not found on PATH"

# 1. Docker
if docker_ready; then
	log "Docker is already running"
else
	log "starting Docker"
	start_docker

	waited=0
	until docker_ready; do
		[ "$waited" -lt "$TIMEOUT" ] || die "Docker was not ready after ${TIMEOUT}s"
		sleep 2
		waited=$((waited + 2))
	done
	log "Docker is ready"
fi

# 2. Compose stack. --wait blocks until the services' healthchecks pass, so the
# database accepts connections before anything that needs it starts.
log "starting the compose stack"
docker compose up -d --wait
log "done"
