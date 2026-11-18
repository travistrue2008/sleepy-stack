# Ideas

Unimplemented ideas and edge cases. Nothing here is a commitment, and an idea
may never be built. Add a short note per idea, with the problem it addresses.

- **Crash handling for the E2E containers.** In the image-based run, restart the
  `api` and `ui` containers if a test kills them (`restart: on-failure` in
  `compose.playwright.yml`), record which test caused it (compare each
  container's restart count before and after every test, or follow
  `docker events`), and make each test wait for `/api/health` before it starts.
  The current test should still fail; only the next one gets a clean start.

Back to the [index](../index.md).
