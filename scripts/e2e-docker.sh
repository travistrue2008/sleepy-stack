#!/usr/bin/env bash

# Runs the Playwright suite against the shipped images instead of dev servers.
#
# The base stack (docker-compose.yml: Postgres, and any shared service added
# later) is started and left running, because it is also the dev stack and holds
# the dev data. The Playwright stack (compose.playwright.yml: api and ui) is
# started once per Playwright worker, N = TEST_MAX_WORKERS (default 1). Stack
# PORT_OFFSET i in 1..N runs on the API_PORT and UI_PORT from .env plus i (3001
# and 5174 for 3000 and 5173 when i is 1), so it never collides with the dev
# servers, and its api joins the base stack's network to reach shared services.
#
#   1. checks the ports, then builds the db, api and ui images
#   2. starts the base stack and prepares the e2e databases once
#   3. starts the N Playwright stacks and waits until every service is healthy
#   4. runs the suite host-side with CI set, so Playwright starts no servers
#   5. reports every time an api or ui container died during the run, with its
#      stack and exit code, and fails the run when that happened even if every
#      test passed
#   6. always tears every Playwright stack down (never the base stack), printing
#      the service logs first on failure
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
PROJECT_PREFIX="example-e2e-$(date +%s)-$$"

# docker-compose.yml names its project, so its default network is this one. The
# base stack's own `up` creates it; it is never created by hand.
SHARED_NETWORK="sleepy-stack-example_default"
BASE_COMPOSE=(docker compose -f docker-compose.yml)

STACK_COUNT=0
started=0
events_pids=()
work_dir=""

log() { echo "e2e-docker.sh: $*"; }
die() { echo "e2e-docker.sh: $*" >&2; exit 1; }

# `date -r <epoch>` is BSD (macOS); `date -d @<epoch>` is GNU (Linux)
format_time() { date -r "$1" +%T 2>/dev/null || date -d "@$1" +%T; }

project_name() { echo "${PROJECT_PREFIX}-$1"; }

# Every call for a stack passes the same variables and -p, so `up`, `logs` and
# `down` all interpolate compose.playwright.yml the same way.
compose_stack() {
	local offset=$1

	shift

	env \
		"API_PORT=$((10#${API_PORT} + offset))" \
		"UI_PORT=$((10#${UI_PORT} + offset))" \
		"PORT_OFFSET=${offset}" \
		docker compose -p "$(project_name "$offset")" -f compose.playwright.yml "$@"
}

# The stacks have no `name:`, so a missing -p would default to the directory name,
# which is the base project's name. The prefix check makes sure this can only ever
# take down a project this script created. Reached only through cleanup, which the
# EXIT trap invokes, so shellcheck does not see the call.
# shellcheck disable=SC2329
teardown_stack() {
	local offset=$1
	local project

	project="$(project_name "$offset")"

	case "$project" in
		example-e2e-?*) ;;
		*)
			echo "e2e-docker.sh: refusing to tear down '${project}'" >&2
			return 1
			;;
	esac

	compose_stack "$offset" down -v || true
}

# invoked by the EXIT trap below, which shellcheck does not follow
# shellcheck disable=SC2329
cleanup() {
	local status=$?
	local offset
	local pids=()

	for pid in ${events_pids[@]+"${events_pids[@]}"}; do
		kill "$pid" 2>/dev/null || true
	done

	if [ "$started" = 1 ]; then
		if [ "$status" -ne 0 ]; then
			for offset in $(seq 1 "$STACK_COUNT"); do
				echo "e2e-docker.sh: logs of stack ${offset}" >&2
				compose_stack "$offset" logs --no-color || true
			done
		fi

		for offset in $(seq 1 "$STACK_COUNT"); do
			teardown_stack "$offset" &
			pids+=($!)
		done

		for pid in ${pids[@]+"${pids[@]}"}; do
			wait "$pid" 2>/dev/null || true
		done
	fi

	if [ -n "$work_dir" ]; then
		rm -rf "$work_dir"
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

# Values already in the environment win over .env, as they do for dotenv and
# compose, so a run can move the base ports: UI_PORT=5200 API_PORT=3200 ...
# These are only the base: the stack itself runs on them plus PORT_OFFSET.
if [ -f .env ]; then
	while IFS='=' read -r key value || [ -n "$key" ]; do
		case "$key" in
			'' | '#'*) continue ;;
		esac

		value="${value%\"}"
		value="${value#\"}"
		value="${value%\'}"
		value="${value#\'}"

		if [ -z "${!key+x}" ]; then
			export "$key=$value"
		fi
	done < .env
fi

: "${POSTGRES_USER:?POSTGRES_USER is not set (see .env.example)}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is not set (see .env.example)}"
: "${POSTGRES_PORT:?POSTGRES_PORT is not set (see .env.example)}"
: "${API_PORT:?API_PORT is not set (see .env.example)}"
: "${UI_PORT:?UI_PORT is not set (see .env.example)}"

for name in API_PORT UI_PORT; do
	case "${!name}" in
		'' | *[!0-9]*) die "${name} must be a whole number, got '${!name}'" ;;
	esac
done

STACK_COUNT="${TEST_MAX_WORKERS:-1}"

case "$STACK_COUNT" in
	'' | *[!0-9]* | 0 | 0[0-9]*)
		die "TEST_MAX_WORKERS must be a positive whole number, got '${STACK_COUNT}'"
		;;
esac

# 10# forces base 10, so a value with a leading zero is not read as octal
last_api_port=$((10#${API_PORT} + STACK_COUNT))
last_ui_port=$((10#${UI_PORT} + STACK_COUNT))

if [ "$last_api_port" -gt 65535 ] || [ "$last_ui_port" -gt 65535 ]; then
	die "the stack ports up to ${last_api_port}/${last_ui_port} are out of range; lower API_PORT and UI_PORT or TEST_MAX_WORKERS"
fi

log "base ports ${API_PORT}/${UI_PORT}, ${STACK_COUNT} stack(s) on offsets 1 to ${STACK_COUNT}"

# 1. Ports first: everything after this point changes state (the database step
# drops and recreates every e2e_* database), so a run that cannot have its ports
# must stop here. Only the ui is published on the host: the api's port is inside
# the compose network.
for offset in $(seq 1 "$STACK_COUNT"); do
	port=$((10#${UI_PORT} + offset))

	if (exec 3<>"/dev/tcp/127.0.0.1/${port}") 2>/dev/null; then
		die "port ${port} is already in use; move the base, for example UI_PORT=5200 API_PORT=3200 bun run test:e2e:ci"
	fi
done

# The root is passed as a named build context, as in each Dockerfile header.
for image in db api ui; do
	log "building example/${image}:${IMAGE_TAG}"

	build_args=()

	# the ui image has no .env, and vite.config.ts fails when either port is missing
	if [ "$image" = ui ]; then
		build_args=(--build-arg "API_PORT=$((10#${API_PORT} + 1))" --build-arg "UI_PORT=$((10#${UI_PORT} + 1))")
	fi

	docker build \
		--quiet \
		${build_args[@]+"${build_args[@]}"} \
		--build-context root=. \
		--file "packages/${image}/Dockerfile" \
		--tag "example/${image}:${IMAGE_TAG}" \
		"packages/${image}" >/dev/null
done

# 2. Base stack. It is idempotent (an already running dev stack is reused) and is
# never torn down by this script.
log "starting the base stack"
"${BASE_COMPOSE[@]}" up -d --wait

docker network inspect "$SHARED_NETWORK" >/dev/null 2>&1 ||
	die "network ${SHARED_NETWORK} not found after starting the base stack; the name: in docker-compose.yml may have changed"

# The databases are prepared once, from the db image, before any stack starts.
# `db:reset e2e` drops every existing e2e_* database, then creates and migrates
# e2e_1..N for N = TEST_MAX_WORKERS.
log "preparing the e2e databases"

docker run --rm \
	--network "$SHARED_NETWORK" \
	-e POSTGRES_HOST=postgres \
	-e POSTGRES_PORT=5432 \
	-e POSTGRES_USER \
	-e POSTGRES_PASSWORD \
	-e TEST_MAX_WORKERS="$STACK_COUNT" \
	"example/db:${IMAGE_TAG}" \
	bun run db:reset e2e

# 3. Playwright stacks. --wait blocks until every healthcheck passes.
log "starting ${STACK_COUNT} Playwright stack(s)"
started=1
work_dir="$(mktemp -d)"
pids=()

for offset in $(seq 1 "$STACK_COUNT"); do
	compose_stack "$offset" up -d --wait >"${work_dir}/up-${offset}.log" 2>&1 &
	pids+=($!)
done

failed=0

for offset in $(seq 1 "$STACK_COUNT"); do
	if ! wait "${pids[$((offset - 1))]}"; then
		failed=1
		echo "e2e-docker.sh: stack ${offset} failed to start:" >&2
		cat "${work_dir}/up-${offset}.log" >&2
	fi
done

[ "$failed" = 0 ] || die "a Playwright stack failed to start"

for offset in $(seq 1 "$STACK_COUNT"); do
	port=$((10#${UI_PORT} + offset))
	ready=0

	for _ in $(seq 1 "$TIMEOUT"); do
		if curl -sf -o /dev/null "http://localhost:${port}/api/health"; then
			ready=1
			break
		fi

		sleep 1
	done

	[ "$ready" = 1 ] || die "stack ${offset}: the ui could not reach the api through its /api proxy"
done

# 4. Suite. CI makes the Playwright config skip its dev servers and dotenv.
# Docker restarts a crashed api or ui (see compose.playwright.yml), so a death is
# invisible unless it is recorded: follow the container `die` events of every
# stack for the whole run. The suite itself also compares restart counts around
# every test (E2E_COMPOSE_PROJECT_PREFIX tells it which projects to inspect).
for offset in $(seq 1 "$STACK_COUNT"); do
	docker events \
		--filter "label=com.docker.compose.project=$(project_name "$offset")" \
		--filter event=die \
		--format '{{.Time}} {{index .Actor.Attributes "com.docker.compose.service"}} exit={{index .Actor.Attributes "exitCode"}}' \
		>"${work_dir}/events-${offset}.log" 2>&1 &
	events_pids+=($!)
done

# give the event streams a moment to attach before the first test runs
sleep 1

log "running the suite with ${STACK_COUNT} worker(s) on ui ports $((10#${UI_PORT} + 1)) to ${last_ui_port}"

status=0

CI=true \
	TEST_MAX_WORKERS="$STACK_COUNT" \
	E2E_COMPOSE_PROJECT_PREFIX="$PROJECT_PREFIX" \
	POSTGRES_HOST=localhost \
	bun run test:e2e:headless "$@" || status=$?

for pid in "${events_pids[@]}"; do
	kill "$pid" 2>/dev/null || true
	wait "$pid" 2>/dev/null || true
done

events_pids=()

# 5. Deaths. The streams are stopped before teardown, so every api or ui entry
# here is a real one.
any_deaths=0

for offset in $(seq 1 "$STACK_COUNT"); do
	deaths="$(grep -E ' (api|ui) exit=' "${work_dir}/events-${offset}.log" || true)"

	[ -n "$deaths" ] || continue

	if [ "$any_deaths" = 0 ]; then
		log "an api or ui container died during the run:"
		any_deaths=1
	fi

	while read -r when service code; do
		log "  stack ${offset} $(format_time "$when") ${service} ${code}"
	done <<< "$deaths"
done

if [ "$any_deaths" = 1 ] && [ "$status" -eq 0 ]; then
	status=1
fi

exit "$status"
