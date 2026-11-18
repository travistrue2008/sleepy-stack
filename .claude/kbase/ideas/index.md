# Ideas

Unimplemented ideas and edge cases. Nothing here is a commitment, and an idea
may never be built. Add a short note per idea, with the problem it addresses.

## More shared E2E services

The image-based E2E run starts the base `docker-compose.yml` once and one
api and ui stack per worker. A new shared service (auth, for example) belongs in
the base file. Per-stack settings that point at it, such as its host name on the
shared network, would go in `compose.playwright.yml`. Open questions: whether a
shared service needs per-worker state (a database or tenant per worker, like
`e2e_<n>`), and how the one-time database step in `scripts/e2e-docker.sh` should
prepare it.

Back to the [index](../index.md).
