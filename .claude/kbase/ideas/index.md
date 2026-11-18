# Ideas

Unimplemented ideas and edge cases. Nothing here is a commitment, and an idea
may never be built. Add a short note per idea, with the problem it addresses.

## Parallel E2E stacks

The image-based E2E run uses one stack and one Playwright worker. To run tests
in parallel there would be one stack per worker, on `base + i` for `i` in
`1..N` (`N` from `TEST_MAX_WORKERS`), each its own compose project, which is why
`STACK_INDEX` in `scripts/e2e-docker.sh` is a parameter.

- A worker picks its stack from `testInfo.parallelIndex`, which stays the same
  when Playwright restarts a worker after a failure.
- A fixture overrides `baseURL`, the Postgres port and the compose project name
  per worker, and the global setup truncates every stack's database.
- The restart check and the `docker events` logger run per stack.
- Two shapes: independent stacks, each with its own Postgres (no compose change,
  `N` Postgres containers), or one shared Postgres with databases `e2e_1..N` and
  `N` api and ui pairs (fewer containers, but the compose file has to be
  restructured or generated).

Not worth it yet: the suite runs in about two seconds, and starting more stacks
takes longer than that. Playwright also parallelizes by test file, so a gain
needs more files or `fullyParallel`.

Back to the [index](../index.md).
