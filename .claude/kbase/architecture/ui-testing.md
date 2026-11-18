# UI and Test Architecture

## Why each package has its own runner

- `packages/api` and `packages/db` run on Bun, so they use Bun's test runner.
  The API's `bunfig.toml` preloads `sleepy-serv/plugin` and `test-setup.ts`, and
  coverage (text and lcov into `./coverage`) is configured there too. These
  settings only apply when `bun test` runs from inside `packages/api`.
- `packages/ui` is built on Vite, which runs on Node, so it uses Vitest.
- `e2e/` uses Playwright (see the [overview](overview.md)).

A bare `bun test` at the repo root is not supported: it would try to run the UI's
Vitest files under Bun. `bun run test` runs the three package suites, each with
its own runner.

## The two Vitest projects

`packages/ui/vitest.config.ts` defines two projects:

- `unit`: jsdom, `src/**/*.test.{ts,tsx}`, with `vitest.setup.ts`. For
  non-component code.
- `storybook`: every `*.stories.tsx` runs as a component test in real Chromium
  through the Playwright provider, headless. Component files get stories only.

Coverage is configured once, at the top level, with the v8 provider (text and
lcov into `./coverage`, `src/**` included, `main.tsx` and stories excluded), so
both projects feed a single report.

## Stories must not depend on a backend

The page code calls the real `fetch`. A story that does not control it ends up
depending on whatever answers `/api` at the time: an unreachable API happens to
look like an empty list, but a reachable API with a broken database returns a
JSON error body, which crashes the page. Stories therefore mock `fetch` in
`beforeEach` (with `spyOn` from `storybook/test`) and restore it afterwards, so
they pass the same way on any machine.

## Time mocking

The API freezes the clock for every test: `test-setup.ts` calls
`jest.useFakeTimers()` and `setSystemTime(EPOCH)` (`2000-01-01T00:00:00.000Z`,
exported from `test-helpers.ts`) before each test and restores real time after.
That keeps timestamps assertable. The UI has no equivalent convention yet; when
one is needed, freeze the clock in the same way rather than reading real time in
assertions.

Back to the [index](../index.md) or the [overview](overview.md).
