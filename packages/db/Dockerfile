# Build from the repo root, passing the root as a named context:
#   docker build --build-context root=. -f packages/db/Dockerfile packages/db
#
# Deliberately not --platform=$BUILDPLATFORM: node_modules is copied into the
# runtime stage as-is, so it has to be installed for the target arch. Running
# this natively on an arm64 build host would put arm64 binaries inside an amd64
# image the moment a dependency ships any. packages/ui/Dockerfile can use that
# flag because only its arch-free dist/ crosses the stage boundary.
FROM oven/bun:1.4.4-alpine AS deps

WORKDIR /repo

COPY --from=root package.json bun.lock ./
COPY --from=root packages/orm/package.json packages/orm/
COPY package.json ./packages/db/package.json

RUN bun install --frozen-lockfile --production --filter '@example/db'

FROM oven/bun:1.4.4-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /repo

COPY --from=deps /repo ./
COPY --from=root packages/orm ./packages/orm

WORKDIR /repo/packages/db

COPY package.json ./
COPY migrations ./migrations
COPY src ./src

USER bun

CMD ["bun", "run", "migrate:up", "main"]
