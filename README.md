# sleepy-stack-example

A starter template for the sleepy-stack: `sleepy-serv` API (Bun), React/Vite/Emotion UI, Drizzle ORM + PostgreSQL, with Docker, Storybook, and Claude Code integration.

Includes a minimal Items CRUD example to demonstrate the full stack.

## Getting started

Node and Bun versions are pinned in [`mise.toml`](mise.toml) and installed by
[mise](https://mise.jdx.dev), so that is the only thing to install by hand.

1. **Install mise**

   ```bash
   brew install mise        # macOS
   curl https://mise.run | sh   # Linux
   ```

2. **Activate it in your shell**. mise puts nothing on `PATH` until you do.

   macOS (zsh by default), where Homebrew already has `mise` on `PATH`:

   ```bash
   echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
   ```

   Linux (bash). Use the absolute path, because the installer drops `mise` in
   `~/.local/bin`, which is often not on `PATH` yet on a fresh machine:

   ```bash
   echo 'eval "$($HOME/.local/bin/mise activate bash)"' >> ~/.bashrc
   ```

   Then open a new shell.

3. **Trust the config and install everything**

   ```bash
   cd sleepy-stack-example
   mise trust
   mise install
   mise run setup
   ```

4. **Add environment variables**

   ```bash
   cp .env.example .env
   ```

5. **Start the database**

   ```bash
   docker compose up -d
   bun run db:reset
   bun run migrate:up
   ```

6. **Run the app**

   ```bash
   cd packages/api && bun dev        # API server on port 3000
   cd packages/ui  && bun run dev    # Vite dev server on port 5173
   ```

Upgrade runtimes with `mise use node@<version>` / `mise use bun@<version>`,
which records the change in `mise.toml`. Do not use `bun upgrade`, which swaps
the binary without mise knowing.

## Commands

```bash
bun run test        # all test suites
bun run test:api    # packages/api, via Bun's test runner
bun run test:ui     # packages/ui, via Vitest (jsdom + Storybook in Chromium)
bun run test:db     # packages/db
bun run test:e2e           # Playwright (e2e/), headed, against dev servers
bun run test:e2e:headless  # same, headless
bun run test:e2e:ci        # Playwright against the built Docker images

bun run typecheck   # all packages (including e2e/)
bun run lint        # ESLint across the repo

cd packages/api && bun dev        # API server
cd packages/ui  && bun run dev    # Vite dev server on 5173
cd packages/ui  && bun run storybook   # Storybook on 6006
```

## End-to-end tests

The Playwright specs live in `e2e/`. They run against a separate `e2e_1`
database, which is truncated before every test.

- `bun run test:e2e` and `bun run test:e2e:headless` start the API and UI dev
  servers themselves, reset the e2e databases (`bun run db:reset e2e`), run the
  specs, and stop everything afterwards. They refuse to reuse servers that are
  already listening, so stop yours first or override the ports for the run:
  `API_PORT=3100 UI_PORT=5273 bun run test:e2e:headless`.
- `bun run test:e2e:ci` builds the db, api and ui images, starts the base stack
  (`docker-compose.yml`, which is also your dev stack) and leaves it running,
  then starts one copy of `compose.playwright.yml` (api, ui) per Playwright
  worker, `TEST_MAX_WORKERS` of them (1 when unset). Copy `i` runs on `API_PORT`
  and `UI_PORT` plus `i` (3001 and 5174 for the first, with the defaults) and
  uses the database `e2e_i`, so it does not collide with your dev servers. The
  specs run against the ui's published ports, and every copy is torn down at the
  end. At the start of a run, `db:reset e2e` drops every `e2e_*` database in your
  dev Postgres and recreates `e2e_1..N`, so do not run this and the dev-server
  mode at the same time. Only one run can use a set of ports at a time: a second
  run stops with a hint, and moving the base for one of them avoids that
  (`UI_PORT=5200 API_PORT=3200 bun run test:e2e:ci`). It needs Docker running and
  is the one to use on a CI runner. If a test takes the api or ui down, Docker
  restarts it and the next test on that stack waits until it is healthy again;
  the test that caused it fails, and the run lists every death with its stack and
  exit code and fails even if all the tests passed.

Playwright needs a Chromium build that matches its version, which
`mise run setup` installs.

## Package layout

| Package | Description |
|---------|-------------|
| `packages/orm` | Drizzle ORM table definitions and shared types |
| `packages/db` | Database CLI (create/drop/reset, migrate up/down/generate) |
| `packages/api` | `sleepy-serv` REST API with file-system routing |
| `packages/ui` | React SPA with Vite, Emotion, and file-system routing |

## How to extend

**Add an API endpoint:** Create `packages/api/src/api/<route>/<method>.ts` following the `sleepy-serv` file-system routing pattern. Add a colocated `.test.ts` file.

**Add a UI page:** Create `packages/ui/src/components/app/<route>/Layout.tsx` (renders `<Outlet />`) and `Page.tsx`. The `vite-react-file-router` plugin auto-generates routes from the folder structure.

**Add a database table:** Define it in `packages/orm/src/schema.ts` using the `BASE_COLUMNS` pattern, then run `bun run migrate:generate` and `bun run migrate:up`.
