# Build from the repo root, passing the root as a named context:
#   docker build --build-context root=. -f packages/api/Dockerfile packages/api
#
# Deliberately not --platform=$BUILDPLATFORM: node_modules is copied into the
# build stage as-is, so it has to be installed for the target arch. Running
# this natively on an arm64 build host would put arm64 binaries inside an amd64
# image the moment a dependency ships any. packages/ui/Dockerfile can use that
# flag because only its arch-free dist/ crosses the stage boundary.
FROM oven/bun:1.4.4-alpine AS deps

WORKDIR /repo

COPY --from=root package.json bun.lock ./
COPY --from=root packages/orm/package.json packages/orm/
COPY package.json ./packages/api/package.json

RUN bun install --frozen-lockfile --production --filter '@example/api'

FROM oven/bun:1.4.4-alpine AS build

WORKDIR /repo

COPY --from=deps /repo ./
COPY --from=root packages/orm ./packages/orm

WORKDIR /repo/packages/api

COPY package.json sleepy.config.ts ./
COPY src ./src

RUN bun run build

FROM oven/bun:1.4.4-alpine AS runtime

ENV NODE_ENV=production
ENV API_PORT=3000

WORKDIR /app

COPY --from=build /repo/packages/api/dist/api ./api

USER bun

EXPOSE 3000

CMD ["./api"]
