# Architecture Overview

A `sleepy-serv` API (Bun), a React/Vite/Emotion UI, Drizzle ORM on PostgreSQL,
and Docker images for each piece. Items CRUD is the worked example.

## Packages

- `packages/orm`: Drizzle table definitions and shared types. Both `api` and
  `db` depend on it, so the schema has one home.
- `packages/db`: the database CLI (`create`, `drop`, `reset`, `migrate
  up|down|generate`) and the migrations. Targets are `main`, `test` and `e2e`.
- `packages/api`: the REST API, with routes derived from the folder layout under
  `src/api` and mounted at `/api`.
- `packages/ui`: the React SPA. Routes are derived from the folder layout under
  `src/components/app`.
- `e2e/` (not a package): the Playwright suite. Its dependencies live in the
  root `package.json`.

## Request path

The browser only talks to the UI origin. Anything under `/api/*` is proxied to
the API: by Vite in development, by Caddy in the built `ui` image (using the
`API_URL` environment variable). Keeping the proxy inside the image makes the
image a complete origin, so tests can drive the shipped artifact.

## Databases

- `main`: the name in `POSTGRES_DB`.
- `test_1..N`: one per Bun test worker, `N` from `TEST_MAX_WORKERS`.
- `e2e_1..N`: for the Playwright suite, the same count rule. Image mode uses all
  N, one per worker. Dev-server mode uses `e2e_1` only.

## Toolchain

mise pins the Node and Bun versions in `mise.toml`. Bun is the package manager
and runs the API and the db CLI. Node runs Vite, Vitest and Storybook for the
UI. VS Code extensions start without the shell's mise activation, so the
`scripts/vscode-*.sh` wrappers run `bun` and `node` through mise.

## Configuration

One root `.env` is symlinked into each package by `scripts/symlink.sh`
(`postinstall`). `vite.config.ts` requires `API_PORT` and `UI_PORT` for every
command, because those values should always be set. The Docker images contain no
`.env`: the `ui` build receives both ports as build arguments, and the running
containers get theirs from compose. No Dockerfile has `EXPOSE`; compose decides
what is published.

## Docker

Each package has a Dockerfile, built from the repo root with
`--build-context root=.` so it can read the root manifest and lockfile.
`docker-compose.yml` is the base stack: the local Postgres, plus any service
shared later (auth, for example). `compose.playwright.yml` is the per-worker
stack for E2E: just an api and a ui.

## E2E

Two modes run the same specs:

- `bun run test:e2e` and `test:e2e:headless`: Playwright starts the API and UI
  dev servers itself. Fast, and the logs and stack traces are easy to read.
- `bun run test:e2e:ci`: builds the images and runs against them through the
  ui's published port. It catches packaging and proxy problems that dev servers
  hide, and is the one for a CI runner.

Every test starts from empty tables: an automatic fixture truncates all schema
tables first, so a failed test never poisons the next one.

### When a container dies during the image-based run

Each test should start clean even if the previous one took a server down, but a
crash of a production-built image is important information and must never be
hidden. So the run recovers and reports, in three layers:

- `api` and `ui` have `restart: unless-stopped` in `compose.playwright.yml`.
  `unless-stopped` and not `on-failure`, because any exit of a server process is
  unexpected, even with exit code 0.
- Before each test the fixture waits for `/api/health` through the ui origin, so
  a test that follows a crash only starts once both servers are back. After each
  test it compares the containers' restart counts with the ones from before, and
  fails that test with "the api container died during this test" if they moved.
  Only the test that caused the crash fails.
- `scripts/e2e-docker.sh` follows `docker events` for the whole run and prints
  every `die` of the api or ui with its time and exit code. It fails the run if
  any happened, even when every test passed. The exit code is only reliable
  here: once a container is running again, `docker inspect` no longer shows it.

Two Docker details shaped this. A restart policy never applies to a container
that was stopped by hand, so `docker kill` and `docker stop` cannot simulate a
crash; the process has to exit by itself (or be OOM-killed). And an ephemeral
host port (`0:5173`) is drawn again whenever the container restarts, so the ui
is published on a fixed port, `"${UI_PORT}:${UI_PORT}"`: the same number on the
host and inside the container, stable across restarts.

### Parallel stacks on a shared base

`scripts/e2e-docker.sh` starts the base stack (`docker-compose.yml`) and never
tears it down: it is the dev stack and holds the dev data. Then it starts one
copy of `compose.playwright.yml` per Playwright worker, `N` = `TEST_MAX_WORKERS`
(1 when unset), as separate compose projects named
`example-e2e-<time>-<pid>-<PORT_OFFSET>`, with `PORT_OFFSET` in `1..N`.

- **Ports.** Copy `PORT_OFFSET` runs on `API_PORT` and `UI_PORT` from `.env` plus
  `PORT_OFFSET`, so 3001 and 5174 for the first with 3000 and 5173. Every compose
  call goes through one function that passes the shifted ports, `PORT_OFFSET` and
  `-p`, so `up`, `logs` and `down` interpolate the file the same way. A caller can
  move the base (`UI_PORT=5200 API_PORT=3200 bun run test:e2e:ci`), because values
  already in the environment win over `.env`. All `N` ui ports are checked before
  anything destructive, so an overlapping run stops early.
- **Shared network.** The base file sets `name: sleepy-stack-example`, so its
  default network is `sleepy-stack-example_default`. The base stack's own `up`
  creates it (the script never runs `docker network create`), and the script
  verifies it exists. `compose.playwright.yml` declares it as `external` and only
  the api joins it (next to its own project network), to reach `postgres`. The ui
  reaches its api over its own project network, so the name `api` stays
  unambiguous for it.
- **Databases.** After the images are built and the base stack is up, one
  `docker run` of the db image runs `db:reset e2e` on that network. It drops every
  existing `e2e_*` database and recreates and migrates `e2e_1..N`. The api of copy
  `i` uses `e2e_i`. Running this at the same time as the dev-server mode would
  clash, as both use `e2e_1`.
- **Start.** The `N` stacks start in the background, each waited on by its own
  PID (a bare `wait` hides a failed job). A stack that fails to start aborts the
  run with that stack's output.
- **Worker to stack.** In image mode `workers` is `TEST_MAX_WORKERS` and
  `fullyParallel` is on. `getWorkerCount()` returns it only when `CI` is set, so
  dev-server mode is always one worker. A test's port offset is
  `testInfo.parallelIndex + 1`, which stays the same when Playwright restarts a
  worker. The `baseURL`, the database to truncate and the project the restart
  check inspects all derive from it. The script passes
  `E2E_COMPOSE_PROJECT_PREFIX` for the last one.
- **Crash detection.** One `docker events` logger per stack; death lines name the
  stack. The shared Postgres is not part of the report.

See [UI and Test Architecture](ui-testing.md) for the unit and component tests.
Back to the [index](../index.md).
