#!/usr/bin/env bash

# Runs the Playwright suite against the shipped images instead of dev servers:
#
#   1. builds the db, api and ui images
#   2. starts compose.playwright.yml and waits until every service is healthy
#   3. runs the suite host-side with CI set, so Playwright starts no servers
#   4. always tears the stack down, printing the service logs first on failure
#
# Extra arguments are passed to Playwright, for example:
#   ./scripts/e2e-docker.sh e2e/tests/items.spec.ts

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# a shell launched from the desktop often has a minimal PATH without the Docker CLI.
export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin:$HOME/.docker/bin"

# seconds to wait for the ui to reach the api through its /api proxy
TIMEOUT="${E2E_READY_TIMEOUT:-30}"

IMAGE_TAG="ci"
PROJECT="example-e2e-$(date +%s)-$$"
COMPOSE=(docker compose -p "$PROJECT" -f compose.playwright.yml)

started=0

log() { echo "e2e-docker.sh: $*"; }
die() { echo "e2e-docker.sh: $*" >&2; exit 1; }

cleanup() {
	local status=$?

	if [ "$started" = 1 ]; then
		if [ "$status" -ne 0 ]; then
			"${COMPOSE[@]}" logs --no-color || true
		fi

		"${COMPOSE[@]}" down -v --remove-orphans || true
	fi

	exit "$status"
}

trap cleanup EXIT

command -v docker >/dev/null 2>&1 || die "the docker CLI was not found on PATH"
docker info >/dev/null 2>&1 || die "the Docker daemon is not running"

# Run bun through mise so the version pinned in mise.toml is used even when the
# shell has not activated mise (a CI runner, a cron job, an editor task).
# shellcheck source=find-mise.sh
. "$ROOT/scripts/find-mise.sh"

if MISE="$(find_mise)"; then
	bun() { "$MISE" exec -- bun "$@"; }
elif ! command -v bun >/dev/null 2>&1; then
	die "neither mise nor bun was found"
fi

if [ -f .env ]; then
	set -a
	# shellcheck disable=SC1091
	. ./.env
	set +a
fi

: "${POSTGRES_USER:?POSTGRES_USER is not set (see .env.example)}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is not set (see .env.example)}"
: "${API_PORT:?API_PORT is not set (see .env.example)}"
: "${UI_PORT:?UI_PORT is not set (see .env.example)}"

# 1. Images. The root is passed as a named build context, as in each Dockerfile header.
for image in db api ui; do
	log "building example/${image}:${IMAGE_TAG}"

	build_args=()

	# the ui image has no .env, and vite.config.ts fails when either port is missing
	if [ "$image" = ui ]; then
		build_args=(--build-arg "API_PORT=${API_PORT}" --build-arg "UI_PORT=${UI_PORT}")
	fi

	docker build \
		--quiet \
		${build_args[@]+"${build_args[@]}"} \
		--build-context root=. \
		--file "packages/${image}/Dockerfile" \
		--tag "example/${image}:${IMAGE_TAG}" \
		"packages/${image}" >/dev/null
done

# 2. Stack. --wait blocks until every healthcheck passes and the one-shot
# services (database creation and migration) have completed.
log "starting the compose stack"
started=1
"${COMPOSE[@]}" up -d --wait

# The host ports are published on ephemeral ports, so ask Docker which ones.
# They are exported only after `up`: compose interpolates the environment, and
# a host-side POSTGRES_PORT must never reach the containers' own settings.
pg_port="$("${COMPOSE[@]}" port postgres 5432 | sed 's/.*://')"
ui_port="$("${COMPOSE[@]}" port ui "$UI_PORT" | sed 's/.*://')"

ready=0

for _ in $(seq 1 "$TIMEOUT"); do
	if curl -sf -o /dev/null "http://localhost:${ui_port}/api/health"; then
		ready=1
		break
	fi

	sleep 1
done

[ "$ready" = 1 ] || die "the ui could not reach the api through its /api proxy"

# 3. Suite. CI makes the Playwright config skip its dev servers and dotenv.
log "running the suite against ui port ${ui_port} and postgres port ${pg_port}"

CI=true \
	POSTGRES_HOST=localhost \
	POSTGRES_PORT="$pg_port" \
	UI_PORT="$ui_port" \
	bun run test:e2e:headless "$@"
