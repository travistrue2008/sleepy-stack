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

See [UI and Test Architecture](ui-testing.md) for the unit and component tests.
Back to the [index](../index.md).
