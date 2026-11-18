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
- `e2e_1..N`: for the Playwright suite, the same count rule. The suite uses
  `e2e_1` only, with one worker.

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
`docker-compose.yml` is the local Postgres. `compose.playwright.yml` is the full
stack for E2E (Postgres, database creation, migrations, api, ui).

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

The script gives compose its own copy of the two ports: `API_PORT` and `UI_PORT`
from `.env` plus `STACK_INDEX` (1), so 3001 and 5174 for 3000 and 5173. That
keeps the stack off the dev servers' ports, and the originals are never changed.
It does this with an `env` prefix on every compose command: compose reads the
rest of `.env` itself, and a variable in the shell environment beats `.env`
(an explicit `--env-file .env` would fail on a runner that has no `.env`). The
suite and the ui image build get the shifted values as well. `STACK_INDEX` is a
constant, not a setting. A caller can still move the base (`UI_PORT=5200
API_PORT=3200 bun run test:e2e:ci`), because values already in the environment
win over `.env`. Two runs cannot overlap on one base: the second stops at an
early "port already in use" check.

See [UI and Test Architecture](ui-testing.md) for the unit and component tests.
Back to the [index](../index.md).
