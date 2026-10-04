# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup

```bash
# install global environment packages/dependencies
brew install mise          # macOS
apt-get install -y mise    # Ubuntu/Debian
```

```bash
# install project-level dependencies
mise install && mise run setup
bun install
```

Make sure Docker is installed on your machine.

## Commands

Make sure this project's Docker compose stack has started before running any commands.

```bash
# Global (run from root)

# testing
bun run test:db                     # run DB tests
bun run test:api                    # run API tests
bun run test:ui                     # run UI tests
bun run test                        # run ALL tests
# TypeScript checking
bun run typecheck:db                # DB TypeScript checks
bun run typecheck:api               # API TypeScript checks
bun run typecheck:ui                # UI TypeScript checks
bun run typecheck                   # ALL TypeScript checks
# linting
bun run lint                        # run lint EVERYTHING
bun run lint:fix                    # run lint fixes
# database management
bun run db:create <main|test>       # create target database
bun run db:drop <main|test>         # drop target database
bun run db:reset <main|test>        # reset target database
# database migration
bun run migrate:generate            # generate new migration
bun run migrate:up <main|test>      # migrate target database up
bun run migrate:down <main|test>    # migrate target database down

# DB (run from packages/db)

# database management
bun run db:create <main|test>       # create target database
bun run db:drop <main|test>         # drop target database
bun run db:reset <main|test>        # reset target database
# database migration
bun run migrate:generate            # generate new migration
bun run migrate:up <main|test>      # migrate target database up
bun run migrate:down <main|test>    # migrate target database down
# misc
bun run typecheck                   # TypeScript checks
bun run test                        # run tests
bun test src/utils.test.ts          # run single test suite

# API (run from packages/api)

bun dev                             # start (watch mode)
bun test                            # run tests
bun test src/utils.test.ts          # run single test suite

# UI (run from packages/ui)

bun run dev                         # run vite dev server (watch mode)
bun run build                       # build React app into static site
bun run preview                     # build preview
bun run storybook                   # start Storybook site (watch mode)
bun run storybook:build             # build Storybook site
bun run typecheck                   # TypeScript checks
bun run test                        # run tests (one-shot)
bun run test -- --project=unit      # run unit tests
bun run test:watch                  # run tests (watch mode)
```

**Runtimes:** Bun is the package manager everywhere and runs `packages/api`.
**Node** runs Vitest and Storybook for `packages/ui`. Both are pinned in
`mise.toml`. Never run `bun upgrade`; use `mise use bun@<version>`.

## Verification

Run `bun run test` from the repo root before considering any change done; that runs both packages, each with its own runner. There is no root `bunfig.toml`, so a bare `bun test` at the root is not a supported command and will try to run the UI's Vitest tests under Bun.

Each package owns its test config. Coverage (text + lcov into `./coverage`) and the `test-setup.ts` preload are configured in `packages/api/bunfig.toml` and are picked up only when `bun test` runs from `packages/api`.

New functionality must be covered by new tests. See `.claude/rules/tests.md` for test styles and test-writing conventions (auto-loads whenever a `*.test.{js,ts,jsx,tsx}` file is in play).

## Instructions

- Be concise in your explanations
- **DO NOT** use em dashes. It is very important that we eliminate using these altogether.
- **DO NOT** make assumptions, and **DO NOT** hallucinate. If you don't know something, then tell me you don't know. It's ok if you don't know the answer.

### Objectivity

Only give me an objective answers as the goal is clarity, and not wishful thinking/comfort. Do not instantly agree with what I'm saying for the sake of agreeing. Be objective. You will act as 3 individuals: the first one gives a response, the second one makes an opposing argument, and the third one acts as the judge who combines the most accurate parts of each argument, and puts them together to form a single answer. Only provide the judge's output.
